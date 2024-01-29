import axios, { AxiosRequestConfig } from "axios";
import _ from "lodash";
import dotenv from "dotenv";
import { BaseServiceCaller } from "./base.js";
import { getServicesUrl } from "../../utils/env.js";

dotenv.config();

interface RerankRequest {
  base_passage: string;
  queries: string[];
}

export class HttpServiceCaller extends BaseServiceCaller {
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
      const postCfg: AxiosRequestConfig = {};

      if (
        !_.isNil(process.env.AUTH_TOKEN) &&
        (process.env.AUTH_TOKEN as string).length > 0
      ) {
        postCfg.headers = {
          "auth-token": process.env.AUTH_TOKEN,
        };
      }

      const response = await axios.post<{ status: string; result: number[] }>(
        rerankerUrl,
        requestData,
        postCfg,
      );

      return response.data.result;
    } catch (error) {
      console.error("Error during the API call:", error);
      throw error;
    }
  }
}

export default new HttpServiceCaller();
