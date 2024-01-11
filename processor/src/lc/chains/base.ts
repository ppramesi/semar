import { LLMChain } from "langchain/chains";
import { Tweet } from "../../types/tweet.js";

export abstract class TweetChain extends LLMChain {
  static processTweets(tweets: Tweet[]): string {
    return tweets.reduce((acc, tweet) => {
      const date = new Date(tweet.date).toISOString();
      return `${acc}<tweet><id>${tweet.id}</id><text>${tweet.text}</text><date>${date}</date><url>${tweet.url}</url></tweet>`;
    }, "");
  }
}
