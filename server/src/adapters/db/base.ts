import _ from "lodash";
import type { FetchTweetsOpts, Tweet } from "../../types/tweet.js";
import { User } from "../../types/user.js";
import { VectorStore } from "langchain/vectorstores/base";

export type DatabaseOpts = {
  vectorstore: VectorStore;
};

export abstract class Database {
  /**
   * Establishes a connection to the database.
   */
  abstract connect(): Promise<void>;

  /**
   * Closes the connection to the database.
   */
  abstract disconnect(): Promise<void>;

  abstract fetchTweet(id: string): Promise<Tweet>;

  abstract fetchTweets(searchOpts: FetchTweetsOpts): Promise<Tweet[]>;

  abstract insertTweet(tweet: Tweet): Promise<Tweet>;

  abstract fetchUser(id: string): Promise<User>;

  abstract insertUser(user: User): Promise<User>;
}
