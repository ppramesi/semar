import { BaseChatModel } from "langchain/chat_models/base";
import type { Summary, Tweet } from "../../types/tweet.js";
import { SemarPostgres } from "../../adapters/db/pg.js";
import { Embeddings } from "langchain/embeddings/base";
import { TagGenerator } from "../../lc/chains/generate_tags.js";
import { TweetSummarizer } from "../../lc/chains/tweet_summarizer.js";
import _ from "lodash";
import { PGFilterWithJoin } from "../../lc/vectorstores/pg.js";
import { v4 } from "uuid";
import { DuplicateChecker } from "../../lc/chains/duplicate_checker.js";
import callerInstance, { HttpServiceCaller } from "../callers/http_caller.js";
import { Callbacks } from "langchain/callbacks";
import { ClassifierAggregator } from "../../processors/classifier_aggregator/base.js";
import { TopicSplitter } from "../../lc/chains/topic_splitter.js";
import { Tag } from "../../types/tag.js";
import { hashToUUID } from "../../utils/hash.js";
import { FetchSummarizer } from "../../processors/fetch_summarizer/base.js";
import { HuggingFaceFetchSummarizer } from "../../processors/fetch_summarizer/hf.js";
import { LLMFaceFetchSummarizer } from "../../processors/fetch_summarizer/llm.js";

export type SemarServerOpts = {
  db: SemarPostgres;
  baseLlm: BaseChatModel;
  classifierAggregator: ClassifierAggregator;
  embeddings: Embeddings;
  llms?: Map<typeof TagGenerator, BaseChatModel>;
  callbacks?: Callbacks;
};

export abstract class SemarServer {
  db: SemarPostgres;
  baseLlm: BaseChatModel;
  embedding: Embeddings;
  tagGenerator: TagGenerator;
  summarizer: TweetSummarizer;
  topicSplitter: TopicSplitter;
  classifierAggregator: ClassifierAggregator;
  dupeChecker: DuplicateChecker;
  serviceCaller: HttpServiceCaller = callerInstance;
  callbacks: Callbacks;
  fetchSummarizer?: FetchSummarizer;

  constructor(opts: SemarServerOpts) {
    this.db = opts.db;
    this.baseLlm = opts.baseLlm;
    this.embedding = opts.embeddings;
    this.callbacks = opts.callbacks ?? [];
    this.classifierAggregator = opts.classifierAggregator;
    this.tagGenerator = new TagGenerator({
      llm: opts.llms?.get(TagGenerator) ?? this.baseLlm,
    });
    this.summarizer = new TweetSummarizer({
      llm: opts.llms?.get(TweetSummarizer) ?? this.baseLlm,
    });
    this.dupeChecker = new DuplicateChecker({
      llm: opts.llms?.get(DuplicateChecker) ?? this.baseLlm,
    });
    this.topicSplitter = new TopicSplitter({
      llm: opts.llms?.get(TopicSplitter) ?? this.baseLlm,
    });

    if (process.env.FETCH_AND_SUMMARIZE === "hf") {
      this.fetchSummarizer = new HuggingFaceFetchSummarizer();
    } else if (process.env.FETCH_AND_SUMMARIZE === "llm") {
      this.fetchSummarizer = new LLMFaceFetchSummarizer({
        llm: this.baseLlm,
        callbacks: this.callbacks,
      });
    }
  }

  async generateTags(tweets: Tweet[]): Promise<string[][]> {
    const procTweets = TagGenerator.processTweets(tweets);
    const { extracted_tags: tags } = await this.tagGenerator.invoke(
      {
        batch_size: tweets.length,
        tweets: procTweets,
      },
      { callbacks: this.callbacks ?? [] },
    );

    return tags as string[][];
  }

  buildPGFilter(tweet: Tweet) {
    let relevancyFilter: PGFilterWithJoin | undefined;
    if (!_.isNil(tweet.tags)) {
      const tsVectTags = tweet.tags
        .map((tag) => {
          const spaceSplit = tag.toLowerCase().split(" ");
          if (spaceSplit.length > 0) {
            return `(${spaceSplit.join(" <-> ")})`;
          }
          return tag.toLowerCase();
        })
        .join(" | ");

      relevancyFilter = {
        columnFilter: {
          text: {
            $textSearch: {
              query: tsVectTags,
              config: "english",
            },
          },
        },
      };
    }

    return relevancyFilter;
  }

  async generateEmbeddings(tweets: Tweet[]): Promise<number[][]> {
    const texts = tweets.map((tweet) => tweet.text);
    return this.embedding.embedDocuments(texts);
  }

  async checkDuplicates(tweets: Tweet[]): Promise<boolean> {
    let text: string | null = null;
    let selectedTweet: Tweet;
    while (_.isNil(text)) {
      const rand = Math.round(Math.random() * (tweets.length - 1));
      selectedTweet = tweets[rand];
      text = selectedTweet.text;
    }

    const docsResult = await this.db.summaryVectorstore.similaritySearch(
      text,
      3,
      this.buildPGFilter(selectedTweet!),
    );
    if (docsResult.length === 0) {
      return false;
    }
    const procTweets = DuplicateChecker.processTweets(tweets);
    const dupeCheckResults = await Promise.all(
      docsResult.map((summary) => {
        return this.dupeChecker.invoke(
          {
            tweets: procTweets,
            summary: summary.pageContent,
            summary_date: summary.metadata["date"],
          },
          { callbacks: this.callbacks ?? [] },
        );
      }),
    );

    return !dupeCheckResults.some((v) => !v.duplicate);
  }

  async embedTweets(tweets: Tweet[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      tweets.map((tweet) => this.embedding.embedQuery(tweet.text)),
    );
    return embeddings;
  }

  async fetchRelevantTweetsFromSearch(keywords: string[]): Promise<Tweet[]> {
    const sevenDaysAgo = new Date(
      new Date().getTime() - 14 * 24 * 60 * 60 * 1000,
    );
    return this.serviceCaller.searchRelevantTweets(
      `("${keywords.join(`" AND "`)}") min_faves:10`,
      sevenDaysAgo,
      new Date(),
    );
  }

  async fetchRelevantTweetsFromVectorStore(
    tweetOrId: string,
    k: number,
  ): Promise<Tweet[]>;
  async fetchRelevantTweetsFromVectorStore(
    tweetOrId: Tweet,
    k: number,
  ): Promise<Tweet[]>;
  async fetchRelevantTweetsFromVectorStore(
    tweetOrId: Tweet | string,
    k: number,
  ): Promise<Tweet[]> {
    let tweet: Tweet;
    if (typeof tweetOrId === "string") {
      tweet = await this.db.fetchTweet(tweetOrId);
    } else {
      tweet = tweetOrId;
    }

    let embeddings: number[];
    if (!_.isNil(tweet.embedding)) {
      embeddings = tweet.embedding;
    } else {
      embeddings = await this.db.tweetVectorstore.embeddings.embedQuery(
        tweet.text,
      );
    }
    const searchResults =
      await this.db.tweetVectorstore.similaritySearchVectorWithScore(
        embeddings,
        k,
        this.buildPGFilter(tweet),
      );
    if (searchResults.length === 0) {
      return [];
    }
    const docs = searchResults.map((res) => res[0]);
    const rerankIndices = await this.serviceCaller.crossEncoderRerank(
      tweet.text,
      docs.map((d) => d.pageContent),
    );
    return SemarPostgres.fromSearchResultsToTweets(
      rerankIndices.map((idx) => docs[idx]),
    ).slice(0, 5);
  }

  async summarizeTweets(
    tweets: Tweet[],
    contextTweets?: Tweet[],
  ): Promise<Summary> {
    const procTweets = TweetSummarizer.processTweets(tweets);
    const conxTweets =
      contextTweets && contextTweets.length > 0
        ? TweetSummarizer.processTweets(contextTweets)
        : "";
    const { text: result } = await this.summarizer.invoke(
      {
        batch_size: tweets.length,
        tweets: procTweets,
        context_tweets: conxTweets,
      },
      { callbacks: this.callbacks ?? [] },
    );
    const allTweets = [...tweets, ...(contextTweets ?? [])];
    const refTweets = allTweets
      .filter((t) => {
        const url = new URL(t.url);
        const statusId = url.pathname
          .split("/")
          .filter((s) => s.length > 0)
          .pop();
        return result.includes(statusId);
      })
      .map((t) => t.id);

    return {
      id: v4(),
      text: result,
      ref_tweets: refTweets,
    };
  }

  async saveTweet(tweet: Tweet): Promise<void> {
    await this.db.insertTweet(tweet);
  }

  async saveTweets(tweets: Tweet[]): Promise<void> {
    await this.db.insertTweets(tweets);
  }

  async saveEmbeddings(
    tweetId: string,
    vectorEmbeddings: number[],
  ): Promise<void> {
    this.db.tweetVectorstore.upsertVectors([tweetId], [vectorEmbeddings]);
  }

  async processTweets(rawTweets: Tweet[]): Promise<void> {
    const uniqueHashes = new Set<string>();

    if (_.isEmpty(rawTweets)) {
      return;
    }
    let tweets = rawTweets;
    tweets.map((tweet) => {
      if (_.isNil(tweet.id)) {
        tweet.id = v4();
      }
    });

    tweets.forEach((tweet) => uniqueHashes.add(hashToUUID(tweet.text)));

    const relevantTags = await this.db.fetchRelevancyTags();

    const preprocessorResult = await this.classifierAggregator.preprocessTweets(
      tweets,
      relevantTags,
    );

    const relevantTweets = await this.classifierAggregator.testRelevancy(
      tweets,
      relevantTags,
      preprocessorResult,
    );
    if (_.isEmpty(tweets)) {
      return;
    }

    const rawAggregated = await this.classifierAggregator.aggregateTweets(
      relevantTweets,
      tweets,
      preprocessorResult,
    );

    const splitByTopic = await rawAggregated.map(async (aggrTweets) => {
      const procTweets = TopicSplitter.processTweets(aggrTweets);
      const { aggregated_tweets: groupedTweetIds } =
        await this.topicSplitter.invoke(
          {
            batch_size: aggrTweets.length,
            tweets: procTweets,
          },
          { callbacks: this.callbacks ?? [] },
        );
      // Map for quick ID to Tweet object lookup
      const idToTweetMap = new Map(tweets.map((tweet) => [tweet.id, tweet]));

      // Transform groupedTweetIds to groups of Tweet objects
      return (groupedTweetIds as string[][]).map((group) =>
        group.map((tweetId) => idToTweetMap.get(tweetId)),
      ) as Tweet[][];
    });

    const separatedAggregated = await Promise.all(splitByTopic).then(
      (tweets) => {
        return tweets.flat();
      },
    );

    const tagsEmbeddings = await Promise.all(
      separatedAggregated.map(async (tweets) => {
        const isDupe = await this.checkDuplicates(tweets);

        if (!isDupe) {
          return Promise.all([
            Promise.resolve(tweets),
            this.generateTags(tweets),
            this.embedTweets(tweets),
          ]);
        } else {
          return Promise.resolve(null);
        }
      }),
    );
    let processed: Summary[];
    try {
      processed = (
        await Promise.all(
          tagsEmbeddings.map(async (tagged) => {
            if (!_.isNil(tagged)) {
              const taggedUniqueHashes = new Set<string>();
              const [tweets, tags, embeddings] = tagged;
              for (let i = 0; i < tweets.length; i++) {
                tweets[i].embedding = embeddings[i];
                tweets[i].tags = tags[i];
              }

              const [vsRelevantTweets, twRelevantTweets] = await Promise.all([
                Promise.all(
                  tweets.map((tweet) =>
                    this.fetchRelevantTweetsFromVectorStore(tweet, 10),
                  ),
                ),
                Promise.all(
                  tags.map((tag) => {
                    return this.fetchRelevantTweetsFromSearch(tag);
                  }),
                ),
                this.saveTweets(tweets),
                this.injectSummaries(tweets),
              ]);
              const currentTags = (
                tweets
                  .map((tweet) => tweet.tags)
                  .filter((v) => !_.isNil(v))
                  .flat() as string[]
              ).map((tag) => {
                return {
                  id: v4(),
                  tag,
                } as Tag;
              });

              console.log({ vsRelevantTweets, twRelevantTweets });
              const contextTweets = [
                ...vsRelevantTweets.flat(),
                ...twRelevantTweets.flat(),
              ].filter((tweet) => {
                const hash = hashToUUID(tweet.text);
                if (uniqueHashes.has(hash) || taggedUniqueHashes.has(hash)) {
                  return false;
                }
                taggedUniqueHashes.add(hash);
                return true;
              });

              console.log({ contextTweets });

              const innerPreprocessorResult =
                await this.classifierAggregator.preprocessTweets(
                  contextTweets,
                  currentTags,
                );

              const filteredContextTweets =
                await this.classifierAggregator.testRelevancy(
                  contextTweets,
                  currentTags,
                  innerPreprocessorResult,
                );

              await this.injectSummaries(filteredContextTweets);

              const summary = await this.summarizeTweets(
                tweets,
                filteredContextTweets,
              );

              return summary;
            } else {
              return null;
            }
          }),
        ).catch((err) => {
          throw err;
        })
      ).filter((v) => !_.isNil(v)) as Summary[];
    } catch (error) {
      console.error(error);
      throw error;
    }

    if (processed.length > 0) {
      await this.db.insertSummaries(processed);
    }
  }

  private async injectSummaries(contextTweets: Tweet[]) {
    if (this.fetchSummarizer) {
      const articles =
        await this.fetchSummarizer.summarizeTweetArticles(contextTweets);
      contextTweets.forEach((_tweet, idx) => {
        if (!_.isEmpty(articles[idx]) && _.isString(articles[idx])) {
          contextTweets[idx].article_summary = articles[idx] as string;
        }
      });
    }
  }

  abstract buildRoute(): void;

  abstract startService(): void;
}
