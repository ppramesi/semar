import axios, { AxiosRequestConfig } from "axios";
import _ from "lodash";
import { Tweet } from "../../types/tweet.js";
import dotenv from "dotenv";
import { BaseServiceCaller } from "./base.js";
import { getServicesUrl } from "../../utils/env.js";

dotenv.config();

interface RerankRequest {
  base_passage: string;
  queries: string[];
}

export class HttpServiceCaller extends BaseServiceCaller {
  harvesterUrl: URL;
  mlUrl?: URL;

  private buildConfig() {
    const postCfg: AxiosRequestConfig = {};

    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      (process.env.AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers = {
        "auth-token": process.env.AUTH_TOKEN,
      };
    }

    return postCfg;
  }

  async zeroShotClassification(
    texts: string[],
    tags: string[],
  ): Promise<string[][]> {
    let zeroShotUrl: string;
    try {
      zeroShotUrl = getServicesUrl("zero-shot-classifier");
    } catch (error) {
      return texts.map((_) => tags);
    }

    try {
      const response = await axios.post<{ status: string; result: string[][] }>(
        zeroShotUrl,
        {
          queries: texts,
          classes: tags,
        },
        this.buildConfig(),
      );

      console.log(response.data);
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
    let rerankerUrl: string;
    try {
      rerankerUrl = getServicesUrl("reranker");
    } catch (error) {
      return queries.map((_, idx) => idx);
    }

    const requestData: RerankRequest = {
      base_passage: basePassage,
      queries: queries,
    };

    try {
      const response = await axios.post<{ status: string; result: number[] }>(
        rerankerUrl,
        requestData,
        this.buildConfig(),
      );

      return response.data.result;
    } catch (error) {
      console.error("Error during the API call:", error);
      throw error;
    }
  }

  async scrapeTweets() {
    try {
      const {
        data: { tweets },
      }: { data: { tweets: Tweet[] } } = await axios.post(
        getServicesUrl("harvester-scrape"),
        {},
        this.buildConfig(),
      );

      return tweets;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async searchRelevantTweets(keywords: string, fromDate: Date, toDate: Date) {
    try {
      const {
        data: { tweets },
      }: { data: { tweets: Tweet[] } } = await axios.post(
        getServicesUrl("harvester-search"),
        {
          searchTerms: keywords,
          fromDate: fromDate.toISOString(),
          toDate: toDate.toISOString(),
        },
        this.buildConfig(),
      );

      return tweets;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async summarizeText(text: string) {
    try {
      const {
        data: { result },
      }: { data: { result: string } } = await axios.post(
        getServicesUrl("summarizer"),
        {
          text,
        },
        this.buildConfig(),
      );

      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }

  async fetchArticles(urls: (string | null)[]) {
    try {
      const {
        data: { result },
      }: { data: { result: (string | null)[] } } = await axios.post(
        getServicesUrl("article-fetcher"),
        {
          urls,
        },
        this.buildConfig(),
      );

      return result;
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export default new HttpServiceCaller();
