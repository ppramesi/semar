import { crawlReturned } from "./crawl";
import axios, { AxiosRequestConfig } from "axios";
import dbInstance, { Database } from "./db";
import crypto from 'crypto';
import authStoreInstance, { AuthStore } from "./auth-store";
import { TweetMappedReturn } from "./types/tweets.types";
import _ from "lodash";

export type RunManagerConfig = {
  accountsSource: "env" | "db";
  period: number;
  tweetCount: number;
  processorUrl: string;
}

function hashToUUID(inputString: string): string {
  // Create an MD5 hash of the input string
  const hash = crypto.createHash('md5').update(inputString).digest('hex');

  // Format the hash as a UUID (8-4-4-4-12)
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

function buildTweetUrl(user: string, id: string) {
  const twitterUrl = new URL("https://twitter.com/");
  twitterUrl.pathname = `/${user}/status/${id}`;
  return twitterUrl.toString();
}

function hoursBeforeRightMeow(num: number) {
  return new Date(new Date().getTime() - num * 1000 * 60 * 60)
}

function buildProcessTweetsUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  url.pathname = "/process-tweets"
  return url.toString();
}

export class RunManager {
  authStore: AuthStore = authStoreInstance;
  accountsSource: "env" | "db";
  db: Database;
  period: number;
  tweetCount: number;
  processorUrl: string;
  constructor(config: RunManagerConfig) {
    this.accountsSource = config.accountsSource;
    this.db = dbInstance;
    this.period = config.period;
    this.tweetCount = config.tweetCount;
    this.processorUrl = config.processorUrl;
  }

  async fetchAccounts() {
    if (this.accountsSource === "db") {
      const accounts = await this.db.fetchScrapeAccounts();
      return accounts.map(v => v.name);
    } else if (this.accountsSource === "env") {
      const accounts = process.env.SCRAPE_ACCOUNTS as string;
      return accounts.split(",");
    } else {
      throw new Error("Accounts source invalid");
    }
  }

  buildSearchTerms(accounts: string[]): string {
    return `-filter:replies ${accounts.map(account => {
      let atSign = "";
      if (!account.startsWith("@")) {
        atSign = "@";
      }
      return `(from:${atSign}${account})`;
    }).join(" OR ")}`;
  }

  async run() {
    const searchTerms = this.buildSearchTerms(await this.fetchAccounts());
    let accessToken = await this.authStore.getAuth();
    let data: TweetMappedReturn[];
    while (_.isNil(data)) {
      try {
        data = await crawlReturned({
          ACCESS_TOKEN: accessToken.source,
          SEARCH_KEYWORDS: searchTerms,
          SEARCH_FROM_DATE: hoursBeforeRightMeow(this.period),
          SEARCH_TO_DATE: new Date(),
          TARGET_TWEET_COUNT: this.tweetCount,
          SEARCH_TAB: "LATEST"
        });    
      } catch (error) {
        if ((error as Error).message === "invalid-twitter-token") {
          accessToken = await this.authStore.rotateAuth();
        } else {
          throw error;
        }
      }
    }

    const tweets = data.map(tweet => {
      const { full_text: text, id_str: id, created_at: createdAt } = tweet.tweet;
      const { name } = tweet.user;

      const tweetUrl = buildTweetUrl(name, id);
      return {
        id: hashToUUID(`${text}${tweetUrl}`),
        text,
        date: createdAt,
        url: tweetUrl
      }
    });

    const postCfg: AxiosRequestConfig = {};

    if (
      !_.isNil(process.env.AUTH_TOKEN) && 
      (process.env.AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers["auth-token"] = process.env.AUTH_TOKEN;
    }

    await axios.post(buildProcessTweetsUrl(this.processorUrl), {
      tweets
    }, postCfg);
  }
}