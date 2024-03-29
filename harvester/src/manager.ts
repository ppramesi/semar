import { crawlReturned } from "./crawl.js";
import axios, { AxiosRequestConfig } from "axios";
import dbInstance, { Database } from "./db.js";
import authStoreInstance, { AuthStore } from "./auth-store.js";
import { TweetMappedReturn } from "./types/tweets.types.js";
import _ from "lodash";
import { hashToUUID } from "./utils/hash.js";
import { getServicesUrl } from "./utils/env.js";

export type TweetCrawlerOutput = {
  id: string;
  text: string;
  date: string;
  url: string;
  media?: {
    text: string[];
    caption: string[];
  }[];
};

export type CrawlManagerConfig = {
  accountsSource: "env" | "db";
  period: number;
  tweetCount: number;
};

function buildTweetUrl(user: string, id: string) {
  const twitterUrl = new URL("https://twitter.com/");
  twitterUrl.pathname = `/${user}/status/${id}`;
  return twitterUrl.toString();
}

function hoursBeforeRightMeow(num: number) {
  return new Date(new Date().getTime() - num * 1000 * 60 * 60);
}

export class CrawlManager {
  authStore: AuthStore = authStoreInstance;
  accountsSource: "env" | "db";
  db: Database;
  period: number;
  tweetCount: number;
  constructor(config: CrawlManagerConfig) {
    this.accountsSource = config.accountsSource;
    this.db = dbInstance;
    this.period = config.period;
    this.tweetCount = config.tweetCount;
  }

  async fetchAccounts() {
    if (this.accountsSource === "db") {
      const accounts = await this.db.fetchScrapeAccounts();
      return accounts.map((v) => v.name);
    } else if (this.accountsSource === "env") {
      const accounts = process.env.SCRAPE_ACCOUNTS as string;
      return accounts.split(",");
    } else {
      throw new Error("Accounts source invalid");
    }
  }

  buildSearchTerms(accounts: string[]): string {
    return `-filter:replies ${accounts
      .map((account) => {
        let atSign = "";
        if (!account.startsWith("@")) {
          atSign = "@";
        }
        return `(from:${atSign}${account})`;
      })
      .join(" OR ")}`;
  }

  async crawl(
    searchTerms: string,
    fromDate: Date,
    toDate: Date,
    tweetCount?: number,
    tab: "LATEST" | "TOP" = "LATEST",
    processImage: boolean = false,
  ): Promise<TweetCrawlerOutput[]> {
    let accessToken = await this.authStore.getAuth();
    let data: TweetMappedReturn[];
    while (_.isNil(data)) {
      try {
        data = await crawlReturned({
          ACCESS_TOKEN: accessToken.source,
          SEARCH_KEYWORDS: searchTerms,
          SEARCH_FROM_DATE: fromDate,
          SEARCH_TO_DATE: toDate,
          TARGET_TWEET_COUNT: tweetCount ?? this.tweetCount,
          SEARCH_TAB: tab,
        });
      } catch (error) {
        if ((error as Error).message === "invalid-twitter-token") {
          accessToken = await this.authStore.rotateAuth();
        } else {
          throw error;
        }
      }
    }

    if (processImage) {
      return Promise.all(
        data.map(async (tweet) => {
          const {
            full_text: text,
            id_str: id,
            created_at: createdAt,
            entities: { media },
          } = tweet.tweet;
          const { screen_name } = tweet.user;

          const tweetUrl = buildTweetUrl(screen_name, id);

          try {
            const procMedia =
              (
                await Promise.all(
                  media?.map(async (m) => {
                    if (
                      !_.isNil(m.media_url_https) &&
                      (m.media_url_https as string).includes(
                        "pbs.twimg.com/media",
                      )
                    ) {
                      try {
                        const [{ data: ocrData }, { data: imtData }] =
                          await Promise.all([
                            this.runOcr(m.media_url_https),
                            this.runCaptioning(m.media_url_https),
                          ]);
                        return {
                          text: ocrData.result as string[],
                          caption: imtData.result as string[],
                        };
                      } catch (error) {
                        console.log(`OCR or captioning fucked up: ${error}`);
                        return null;
                      }
                    }
                    return null;
                  }),
                )
              ).filter((v) => !_.isNil(v)) ?? [];
            return {
              id: hashToUUID(`${text}${tweetUrl}`),
              text,
              date: createdAt,
              url: tweetUrl,
              media: procMedia,
            };
          } catch (error) {
            return {
              id: hashToUUID(`${text}${tweetUrl}`),
              text,
              date: createdAt,
              url: tweetUrl,
            };
          }
        }),
      );
    } else {
      return data.map((tweet) => {
        const {
          full_text: text,
          id_str: id,
          created_at: createdAt,
        } = tweet.tweet;
        const { screen_name } = tweet.user;

        const tweetUrl = buildTweetUrl(screen_name, id);
        return {
          id: hashToUUID(`${text}${tweetUrl}`),
          text,
          date: createdAt,
          url: tweetUrl,
        };
      });
    }
  }

  async runCaptioning(imageUrl: string) {
    const postCfg: AxiosRequestConfig = {};

    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      (process.env.AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers = {
        "auth-token": process.env.AUTH_TOKEN,
      };
    }

    return axios.post(
      getServicesUrl("captioner"),
      {
        imageUrl,
      },
      postCfg,
    );
  }

  async runOcr(imageUrl: string) {
    const postCfg: AxiosRequestConfig = {};

    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      (process.env.AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers = {
        "auth-token": process.env.AUTH_TOKEN,
      };
    }

    return axios.post(
      getServicesUrl("ocr"),
      {
        imageUrl,
      },
      postCfg,
    );
  }

  async crawlWithSearch() {
    const searchTerms = this.buildSearchTerms(await this.fetchAccounts());
    const tweets = await this.crawl(
      searchTerms,
      hoursBeforeRightMeow(this.period),
      new Date(),
      5,
      "TOP",
      process.env.USE_IR === "true",
    );

    return tweets;
  }
}
