import axios, { AxiosRequestConfig } from "axios";
import _ from "lodash";
import { Tweet } from "../../types/tweet.js";
import dotenv from "dotenv";
import { BaseServiceCaller } from "./base.js";

dotenv.config();

interface RerankRequest {
  base_passage: string;
  queries: string[];
}

export class HttpServiceCaller extends BaseServiceCaller {
  harvesterUrl: URL;
  mlUrl?: URL;
  constructor() {
    super();
    if (_.isNil(process.env.HARVESTER_URL)) {
      throw new Error("HARVESTER_URL not set");
    }
    this.harvesterUrl = new URL(process.env.HARVESTER_URL as string);
    this.harvesterUrl.port = process.env.HARVESTER_PORT as string;
    if (!_.isEmpty(process.env.ML_URL)) {
      this.mlUrl = new URL(process.env.ML_URL as string);
      this.mlUrl.port = process.env.ML_PORT as string;
    }
  }

  async zeroShotClassification(
    texts: string[],
    tags: string[],
  ): Promise<string[][]> {
    if (
      _.isNil(this.mlUrl) ||
      process.env.ZERO_SHOT_CLASSIFY_TWEETS !== "true"
    ) {
      return texts.map((_) => tags);
    }

    this.mlUrl.pathname = "/classify";
    try {
      const postCfg: AxiosRequestConfig = {};

      if (
        !_.isNil(process.env.AUTH_TOKEN) &&
        (process.env.AUTH_TOKEN as string).length > 0
      ) {
        postCfg.headers = {
          "auth-token": process.env.AUTH_TOKEN,
        };
      }

      const response = await axios.post<{ status: string, result: string[][] }>(
        this.mlUrl.toString(),
        {
          queries: texts,
          classes: tags,
        },
        postCfg,
      );

      return response.data.result;
    } catch (error) {
      console.error("Error during the API call:", error);
      throw error;
    }
  }

  async crossEncoderRerank(
    basePassage: string,
    queries: string[],
  ): Promise<number[]> {
    if (
      _.isNil(this.mlUrl) ||
      process.env.RERANK_VECTOR_SEARCH_RESULTS !== "true"
    ) {
      return queries.map((_, idx) => idx);
    }

    const requestData: RerankRequest = {
      base_passage: basePassage,
      queries: queries,
    };

    this.mlUrl.pathname = "/rerank";

    try {
      const postCfg: AxiosRequestConfig = {};

      if (
        !_.isNil(process.env.AUTH_TOKEN) &&
        (process.env.AUTH_TOKEN as string).length > 0
      ) {
        postCfg.headers = {
          "auth-token": process.env.AUTH_TOKEN,
        };
      }

      const response = await axios.post<number[]>(
        this.mlUrl.toString(),
        requestData,
        postCfg,
      );

      return response.data;
    } catch (error) {
      console.error("Error during the API call:", error);
      throw error;
    }
  }

  async searchRelevantTweets(keywords: string, fromDate: Date, toDate: Date) {
    this.harvesterUrl.pathname = "/search-relevant-tweets";
    try {
      const postCfg: AxiosRequestConfig = {};

      if (
        !_.isNil(process.env.AUTH_TOKEN) &&
        (process.env.AUTH_TOKEN as string).length > 0
      ) {
        postCfg.headers = {
          "auth-token": process.env.AUTH_TOKEN,
        };
      }

      const {
        data: { tweets },
      }: { data: { tweets: Tweet[] } } = await axios.post(
        this.harvesterUrl.toString(),
        {
          searchTerms: keywords,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        },
        postCfg,
      );

      return tweets;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export default new HttpServiceCaller();
