import { Tag } from "../../types/tag.js";
import { Tweet } from "../../types/tweet.js";

export abstract class ClassifierAggregator {
  abstract preprocessTweets(tweets: Tweet[], tags: Tag[]): Promise<any>;
  abstract testRelevancy(
    tweets: Tweet[],
    tags: Tag[],
    extraOpts?: Record<string, any>,
  ): Promise<Tweet[]>;
  abstract aggregateTweets(
    relevantTweets: Tweet[],
    originalTweets: Tweet[],
    extraOpts?: Record<string, any>,
  ): Promise<Tweet[][]>;
}
