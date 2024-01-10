import axios, { AxiosRequestConfig } from "axios";
import _ from "lodash";

export class Caller {
  harvesterUrl: URL;
  tweetProcessorUrl: URL;

  constructor() {
    if (_.isNil(process.env.HARVESTER_URL)) {
      throw new Error("HARVESTER_URL not set");
    }
    if (_.isNil(process.env.HARVESTER_PORT)) {
      throw new Error("HARVESTER_PORT not set");
    }
    const harvesterUrl = new URL(process.env.HARVESTER_URL);
    harvesterUrl.port = process.env.HARVESTER_PORT;
    this.harvesterUrl = harvesterUrl;

    if (_.isNil(process.env.TWEET_PROCESSOR_URL)) {
      throw new Error("TWEET_PROCESSOR_URL not set");
    }
    if (_.isNil(process.env.TWEET_PROCESSOR_PORT)) {
      throw new Error("TWEET_PROCESSOR_PORT not set");
    }
    const tweetProcessorUrl = new URL(process.env.TWEET_PROCESSOR_URL);
    tweetProcessorUrl.port = process.env.TWEET_PROCESSOR_PORT;
    this.tweetProcessorUrl = tweetProcessorUrl;
  }

  async callScrapeTweets(): Promise<void> {
    this.harvesterUrl.pathname = "/scrape-tweets";

    const postCfg: AxiosRequestConfig = {};

    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      (process.env.AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers = {
        "auth-token": process.env.AUTH_TOKEN,
      };
    }

    await axios.post(this.harvesterUrl.toString(), {}, postCfg);
  }
}

export default new Caller();
