import { BaseChatModel } from "langchain/chat_models/base";
import type { Summary, Tweet } from "../../types/tweet.js";
import { SemarPostgres } from "../../adapters/db/pg.js";
import { Embeddings } from "langchain/embeddings/base";
import { TagGenerator } from "../../lc/chains/generate_tags.js";
import { TweetSummarizer } from "../../lc/chains/summarizer.js";
import { TweetRelevancyEvaluator } from "../../lc/chains/relevancy.js";
import _ from "lodash";
import { PGFilter } from "../../lc/vectorstores/pg.js";
import { TweetAggregator } from "../../lc/chains/aggregator.js";
import { v4 } from "uuid";
import { DuplicateChecker } from "../../lc/chains/duplicate_checker.js";
import callerInstance, { ServiceCaller } from "../caller.js";
import { Callbacks } from "langchain/callbacks";

export type SemarServerOpts = {
  db: SemarPostgres;
  baseLlm: BaseChatModel;
  llms?: Map<typeof TagGenerator, BaseChatModel>;
  embeddings: Embeddings;
  callbacks?: Callbacks;
};

export abstract class SemarServer {
  db: SemarPostgres;
  baseLlm: BaseChatModel;
  embedding: Embeddings;
  tagGenerator: TagGenerator;
  summarizer: TweetSummarizer;
  aggregator: TweetAggregator;
  relevancyEvaluator: TweetRelevancyEvaluator;
  dupeChecker: DuplicateChecker;
  serviceCaller: ServiceCaller = callerInstance;
  callbacks: Callbacks;
  constructor(opts: SemarServerOpts) {
    this.db = opts.db;
    this.baseLlm = opts.baseLlm;
    this.embedding = opts.embeddings;
    this.callbacks = opts.callbacks ?? [];
    this.tagGenerator = new TagGenerator({
      llm: opts.llms?.get(TagGenerator) ?? this.baseLlm,
    });
    this.summarizer = new TweetSummarizer({
      llm: opts.llms?.get(TweetSummarizer) ?? this.baseLlm,
    });
    this.relevancyEvaluator = new TweetRelevancyEvaluator({
      llm: opts.llms?.get(TweetRelevancyEvaluator) ?? this.baseLlm,
    });
    this.aggregator = new TweetAggregator({
      llm: opts.llms?.get(TweetAggregator) ?? this.baseLlm,
    });
    this.dupeChecker = new DuplicateChecker({
      llm: opts.llms?.get(DuplicateChecker) ?? this.baseLlm,
    });
  }

  async generateTags(tweets: Tweet[]): Promise<string[][]> {
    const procTweets = TagGenerator.processTweets(tweets);
    const { extracted_tags: tags } = await this.tagGenerator.call(
      {
        batch_size: tweets.length,
        tweets: procTweets,
      },
      { callbacks: this.callbacks ?? [] },
    );

    return tags as string[][];
  }

  async generateEmbeddings(tweets: Tweet[]): Promise<number[][]> {
    const texts = tweets.map((tweet) => tweet.text);
    return this.embedding.embedDocuments(texts);
  }

  async checkDuplicates(tweets: Tweet[]): Promise<boolean> {
    let text: string | null = null;
    while (_.isNil(text)) {
      const rand = Math.round(Math.random() * (tweets.length - 1));
      text = tweets[rand].text;
    }
    const docsResult = await this.db.summaryVectorstore.similaritySearch(
      text,
      3,
    );
    if (docsResult.length === 0) {
      return false;
    }
    const procTweets = DuplicateChecker.processTweets(tweets);
    const dupeCheckResults = await Promise.all(
      docsResult.map((summary) => {
        return this.dupeChecker.call(
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

    const relevancyFilter: PGFilter = {};
    if (!_.isNil(tweet.tags)) {
      const tsVectTags = tweet.tags.join(" | ");
      relevancyFilter["text"] = {
        $textSearch: {
          query: tsVectTags,
          type: "plain",
          config: "english",
        },
      };
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
        relevancyFilter,
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

  async aggregateTweets(tweets: Tweet[]): Promise<Tweet[][]> {
    const procTweets = TweetAggregator.processTweets(tweets);
    const { aggregated_tweets: groupedTweetIds } = await this.aggregator.call(
      {
        batch_size: tweets.length,
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
    const { text: result } = await this.summarizer.call(
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

  async filterRelevantTweets(tweets: Tweet[]) {
    const relevantTags = await this.db.fetchRelevancyTags();
    if (relevantTags.length > 0) {
      const { relevant_tweets: ids } = await this.relevancyEvaluator.call(
        {
          batch_size: tweets.length,
          tweets: TweetRelevancyEvaluator.processTweets(tweets),
          topics: relevantTags.map((t) => t.tag).join(", "),
        },
        { callbacks: this.callbacks ?? [] },
      );
      return tweets.filter((t) => (ids as string[]).includes(t.id));
    } else {
      return tweets;
    }
  }

  async processTweets(rawTweets: Tweet[]): Promise<void> {
    if (_.isEmpty(rawTweets)) {
      return;
    }
    let tweets = rawTweets;
    tweets.map((tweet) => {
      if (_.isNil(tweet.id)) {
        tweet.id = v4();
      }
    });
    tweets = await this.filterRelevantTweets(tweets);
    if (_.isEmpty(tweets)) {
      return;
    }
    const rawAggregated = await this.aggregateTweets(tweets);

    const tagsEmbeddings = await Promise.all(
      rawAggregated.map(async (tweets) => {
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
              const [tweets, tags, embeddings] = tagged;
              for (let i = 0; i < tweets.length; i++) {
                tweets[i].embedding = embeddings[i];
                tweets[i].tags = tags[i];
              }
              const [vsRelevantTweets, twRelevantTweets] = await Promise.all([
                this.fetchRelevantTweetsFromVectorStore(tweets[0], 10),
                this.fetchRelevantTweetsFromSearch(tags[0]),
                this.saveTweets(tweets),
              ]);
              console.log({ vsRelevantTweets, twRelevantTweets });
              const summary = await this.summarizeTweets(tweets, [
                ...vsRelevantTweets,
                ...twRelevantTweets,
              ]);

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

  abstract buildRoute(): void;

  abstract startService(): void;
}
