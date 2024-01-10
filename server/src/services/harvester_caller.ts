import axios from "axios";
import _ from "lodash";
import { Tweet } from "../types/tweet.js";
import dotenv from "dotenv";

dotenv.config();

export class HarvesterCaller {
  harvesterUrl: URL;
  constructor() {
    if (_.isNil(process.env.HARVESTER_URL)) {
      throw new Error("HARVESTER_URL not set");
    }
    this.harvesterUrl = new URL(process.env.HARVESTER_URL as string);
    this.harvesterUrl.port = process.env.HARVESTER_PORT as string;
  }

  async searchRelevantTweets(keywords: string, fromDate: Date, toDate: Date) {
    this.harvesterUrl.pathname = "/search-relevant-tweets";
    try {
      const { data }: { data: { data: Tweet[] }} = await axios.post(
        this.harvesterUrl.toString(),
        {
          searchTerms: keywords,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        },
        {
          headers: {
            "auth-token": process.env.AUTH_TOKEN
          }
        }
      );
      
      return data.data;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export default new HarvesterCaller();
