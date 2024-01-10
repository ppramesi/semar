import axios from "axios";
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
    const rawHarvesterUrl = new URL(process.env.HARVESTER_URL);
    rawHarvesterUrl.port = process.env.HARVESTER_PORT;
    this.harvesterUrl = rawHarvesterUrl;

    if (_.isNil(process.env.TWEET_PROCESSOR_URL)) {
      throw new Error("TWEET_PROCESSOR_URL not set");
    }
    if (_.isNil(process.env.TWEET_PROCESSOR_PORT)) {
      throw new Error("TWEET_PROCESSOR_PORT not set");
    }
    const rawTweetProcessorUrl = new URL(process.env.TWEET_PROCESSOR_URL);
    rawTweetProcessorUrl.port = process.env.TWEET_PROCESSOR_PORT;
    this.tweetProcessorUrl = rawTweetProcessorUrl;
  }

  async callScrapeTweets(): Promise<void> {
    this.harvesterUrl.pathname = "/scrape-tweets";
    await axios.post(
      this.harvesterUrl.toString(),
      {},
      {
        headers: {
          "auth-token": process.env.AUTH_TOKEN,
        },
      },
    );
  }
}

export default new Caller();
