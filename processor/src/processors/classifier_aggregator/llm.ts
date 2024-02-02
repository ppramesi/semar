import { BaseChatModel } from "langchain/chat_models/base";
import { TweetAggregator } from "../../lc/chains/aggregator.js";
import { TagGenerator } from "../../lc/chains/generate_tags.js";
import { TweetRelevancyEvaluator } from "../../lc/chains/relevancy.js";
import { Tag } from "../../types/tag.js";
import { Tweet } from "../../types/tweet.js";
import { ClassifierAggregator } from "./base.js";
import { Callbacks } from "langchain/callbacks";

export type LLMClassifierAggregatorOpts = {
  baseLlm: BaseChatModel;
  callbacks?: Callbacks;
  llms?: Map<typeof TagGenerator, BaseChatModel>;
};

export class LLMClassifierAggregator extends ClassifierAggregator {
  relevancyEvaluator: TweetRelevancyEvaluator;
  aggregator: TweetAggregator;
  callbacks?: Callbacks;
  constructor(opts: LLMClassifierAggregatorOpts) {
    super();
    this.callbacks = opts.callbacks;
    this.relevancyEvaluator = new TweetRelevancyEvaluator({
      llm: opts.llms?.get(TweetRelevancyEvaluator) ?? opts.baseLlm,
    });
    this.aggregator = new TweetAggregator({
      llm: opts.llms?.get(TweetAggregator) ?? opts.baseLlm,
    });
  }

  preprocessTweets(_tweets: Tweet[], _tags: Tag[]): Promise<any> {
    return Promise.resolve({});
  }

  async testRelevancy(tweets: Tweet[], tags: Tag[]): Promise<Tweet[]> {
    if (tags.length > 0) {
      const { relevant_tweets: ids } = await this.relevancyEvaluator.invoke(
        {
          batch_size: tweets.length,
          tweets: TweetRelevancyEvaluator.processTweets(tweets),
          topics: tags.map((t) => t.tag).join(", "),
        },
        { callbacks: this.callbacks ?? [] },
      );
      return tweets.filter((t) => (ids as string[]).includes(t.id));
    } else {
      return tweets;
    }
  }

  async aggregateTweets(
    relevantTweets: Tweet[],
    _originalTweets: Tweet[],
  ): Promise<Tweet[][]> {
    const procTweets = TweetAggregator.processTweets(relevantTweets);
    const { aggregated_tweets: groupedTweetIds } = await this.aggregator.invoke(
      {
        batch_size: relevantTweets.length,
        tweets: procTweets,
      },
      { callbacks: this.callbacks ?? [] },
    );
    // Map for quick ID to Tweet object lookup
    const idToTweetMap = new Map(
      relevantTweets.map((tweet) => [tweet.id, tweet]),
    );

    // Transform groupedTweetIds to groups of Tweet objects
    return (groupedTweetIds as string[][]).map((group) =>
      group.map((tweetId) => idToTweetMap.get(tweetId)),
    ) as Tweet[][];
  }
}
