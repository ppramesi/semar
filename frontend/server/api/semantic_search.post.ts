import { Summary } from "~/types/summary";
import axios, { AxiosRequestConfig } from "axios";
import { defineEventHandler, readBody } from "h3";
import _ from "lodash";
import { getServicesUrl } from "~/lib/env";

export default defineEventHandler(async (event) => {
  try {
    const { query } = await readBody<{ query: string }>(event);
    const postCfg: AxiosRequestConfig = {};
    console.log({ query, token: process.env.NUXT_AUTH_TOKEN });
    if (
      !_.isNil(process.env.NUXT_AUTH_TOKEN) &&
      (process.env.NUXT_AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers = {
        "auth-token": process.env.NUXT_AUTH_TOKEN,
      };
    }
    
    const response = await axios.post<{ status: string; result: Summary[] }>(
      getServicesUrl("semantic-search"), 
      {
        query
      },
      postCfg
    );

    return response.data.result;
  } catch (error) {
    console.error(error);
    event.node.res.statusCode = 500;
    return { error: (error as Error).message };
  }
});