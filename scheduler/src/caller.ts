import axios, { AxiosRequestConfig } from "axios";
import _ from "lodash";
import { getServicesUrl } from "./utils/env.js";

export class Caller {
  async callStartPipeline(): Promise<void> {
    const postCfg: AxiosRequestConfig = {};

    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      (process.env.AUTH_TOKEN as string).length > 0
    ) {
      postCfg.headers = {
        "auth-token": process.env.AUTH_TOKEN,
      };
    }

    console.log(`start pipeline ${getServicesUrl("processor-start-pipeline")}`);
    await axios.post(getServicesUrl("processor-start-pipeline"), {}, postCfg);
  }
}

export default new Caller();
