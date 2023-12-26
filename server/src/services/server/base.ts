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

export type SemarServerOpts = {
  db: SemarPostgres;
  llm: BaseChatModel;
  embeddings: Embeddings;
};

export default abstract class SemarServer {
  db: SemarPostgres;
  llm: BaseChatModel;
  embedding: Embeddings;
  tagGenerator: TagGenerator;
  summarizer: TweetSummarizer;
  aggregator: TweetAggregator;
  relevancyEvaluator: TweetRelevancyEvaluator;
  dupeChecker: DuplicateChecker;
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

  async generateTags(tweets: Tweet[]): Promise<string[]> {
    const procTweets = TagGenerator.processTweets(tweets);
    const { extracted_tags: tags } = await this.tagGenerator.call({
      batch_numbers: tweets.length,
      tweets: procTweets,
    });

    return tags as string[];
  }

  async generateEmbeddings(tweets: Tweet[]): Promise<number[][]> {
    const texts = tweets.map((tweet) => tweet.text);
    return this.embedding.embedDocuments(texts);
  }

  async checkDuplicates(tweets: Tweet[]): Promise<boolean> {
    const rand = Math.round(Math.random() * tweets.length);
    const docsResult = await this.db.summaryVectorstore.similaritySearch(
      tweets[rand].text,
      3,
    );
    const procTweets = DuplicateChecker.processTweets(tweets);
    const dupeCheckResults = await Promise.all(
      docsResult
        .map((v) => v.pageContent)
        .map((summary) => {
          return this.dupeChecker.call({
            tweets: procTweets,
            summary,
          });
        }),
    );

    return !dupeCheckResults.some((v) => !v);
  }

  async embedTweets(tweets: Tweet[]): Promise<number[][]> {
    const embeddings = await Promise.all(
      tweets.map((tweet) => this.embedding.embedQuery(tweet.text)),
    );
    return embeddings;
  }

  async fetchRelevantTweets(tweetOrId: string, k: number): Promise<Tweet[]>;
  async fetchRelevantTweets(tweetOrId: Tweet, k: number): Promise<Tweet[]>;
  async fetchRelevantTweets(
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
    const docs = searchResults.map((res) => res[0]);
    return SemarPostgres.fromSearchResultsToTweets(docs);
  }

  async aggregateTweets(tweets: Tweet[]): Promise<Tweet[][]> {
    const procTweets = TweetAggregator.processTweets(tweets);
    const { aggregated_tweets: groupedTweetIds } = await this.aggregator.call({
      batch_numbers: tweets.length,
      tweets: procTweets,
    });

    return Promise.all(
      (groupedTweetIds as string[][]).map((tweetIds) => {
        return Promise.all(tweetIds.map(this.db.fetchTweet));
      }),
    );
  }

  async summarizeTweets(tweets: Tweet[]): Promise<Summary> {
    const procTweets = TweetSummarizer.processTweets(tweets);
    const { text: result } = await this.summarizer.call({
      batch_numbers: tweets.length,
      tweets: procTweets,
    });

    return {
      id: v4(),
      text: result,
      sources_id: tweets.map((t) => t.id),
    };
  }

  // async checkDuplicates(tweet: Tweet): Promise<boolean> {
  //   return false;
  // }

  // async generateSummary(tweets: Tweet[]): Summary {
  //   const procTweets = TweetSummarizer.processTweets(tweets);
  // }

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

  async processTweets(tweets: Tweet[]): Promise<void> {
    tweets.map((tweet) => {
      if (_.isNil(tweet.id)) {
        tweet.id = v4();
      }
    });
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
              tweets[i].tags = tags;
            }
            const [relevantTweets] = await Promise.all([
              this.fetchRelevantTweets(tweets[0], 5),
              this.saveTweets(tweets),
            ]);

            const combinedTweets = [...relevantTweets, ...tweets];
            return this.summarizeTweets(combinedTweets);
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
