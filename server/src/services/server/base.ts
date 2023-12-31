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
import harvesterCallerInstance, {
  HarvesterCaller,
} from "../harvester_caller.js";

export type SemarServerOpts = {
  db: SemarPostgres;
  llm: BaseChatModel;
  embeddings: Embeddings;
};

export abstract class SemarServer {
  db: SemarPostgres;
  llm: BaseChatModel;
  embedding: Embeddings;
  tagGenerator: TagGenerator;
  summarizer: TweetSummarizer;
  aggregator: TweetAggregator;
  relevancyEvaluator: TweetRelevancyEvaluator;
  dupeChecker: DuplicateChecker;
  harvesterCaller: HarvesterCaller = harvesterCallerInstance;
  constructor(opts: SemarServerOpts) {
    this.db = opts.db;
    this.llm = opts.llm;
    this.embedding = opts.embeddings;
    this.tagGenerator = new TagGenerator({
      llm: this.llm,
    });
    this.summarizer = new TweetSummarizer({
      llm: this.llm,
    });
    this.relevancyEvaluator = new TweetRelevancyEvaluator({
      llm: this.llm,
    });
    this.aggregator = new TweetAggregator({
      llm: this.llm,
    });
    this.dupeChecker = new DuplicateChecker({
      llm: this.llm,
    });
  }

  async generateTags(tweets: Tweet[]): Promise<string[][]> {
    const procTweets = TagGenerator.processTweets(tweets);
    const { extracted_tags: tags } = await this.tagGenerator.call({
      batch_size: tweets.length,
      tweets: procTweets,
    });

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
        return this.dupeChecker.call({
          tweets: procTweets,
          summary: summary.pageContent,
          summary_date: summary.metadata["date"],
        });
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
      new Date().getTime() - 7 * 24 * 60 * 60 * 1000,
    );
    return this.harvesterCaller.searchRelevantTweets(
      `("${keywords.join(`" OR "`)}") min_faves:100`,
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
    return SemarPostgres.fromSearchResultsToTweets(docs);
  }

  async aggregateTweets(tweets: Tweet[]): Promise<Tweet[][]> {
    const procTweets = TweetAggregator.processTweets(tweets);
    const { aggregated_tweets: groupedTweetIds } = await this.aggregator.call({
      batch_size: tweets.length,
      tweets: procTweets,
    });
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
    const { text: result } = await this.summarizer.call({
      batch_size: tweets.length,
      tweets: procTweets,
      context_tweets: conxTweets,
    });
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
      const { relevant_tweets: ids } = await this.relevancyEvaluator.call({
        batch_size: tweets.length,
        tweets: TweetRelevancyEvaluator.processTweets(tweets),
        topics: relevantTags.map((t) => t.tag).join(","),
      });
      return tweets.filter((t) => (ids as string[]).includes(t.id));
    } else {
      return tweets;
    }
  }

  async processTweets(rawTweets: Tweet[]): Promise<void> {
    let tweets = rawTweets;
    tweets.map((tweet) => {
      if (_.isNil(tweet.id)) {
        tweet.id = v4();
      }
    });
    tweets = await this.filterRelevantTweets(tweets);
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

    const processed = (
      await Promise.all(
        tagsEmbeddings.map(async (tagged) => {
          if (!_.isNil(tagged)) {
            const [tweets, tags, embeddings] = tagged;
            for (let i = 0; i < tweets.length; i++) {
              tweets[i].embedding = embeddings[i];
              tweets[i].tags = tags[i];
            }
            const [vsRelevantTweets, twRelevantTweets] = await Promise.all([
              this.fetchRelevantTweetsFromVectorStore(tweets[0], 5),
              this.fetchRelevantTweetsFromSearch(tags[0]),
              this.saveTweets(tweets),
            ]);
            const summary = await this.summarizeTweets(tweets, [
              ...vsRelevantTweets,
              ...twRelevantTweets,
            ]);

            return summary;
          } else {
            return null;
          }
        }),
      )
    ).filter((v) => !_.isNil(v)) as Summary[];

    if (processed.length > 0) {
      await this.db.insertSummaries(processed);
    }
  }

  abstract buildRoute(): void;

  abstract startService(): void;
}
