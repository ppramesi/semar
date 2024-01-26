import { cloudEvent } from "@google-cloud/functions-framework";
import _ from "lodash";
import axios, { type AxiosRequestConfig } from "axios";

function callStartPipeline(url: string, authToken?: string){
  const postCfg: AxiosRequestConfig = {};

  if (
    !_.isNil(authToken) &&
    (authToken as string).length > 0
  ) {
    postCfg.headers = {
      "auth-token": authToken,
    };
  }

  return axios.post(url, {}, postCfg);
}

cloudEvent("invokePipeline", async () => {
  const pipelineEndpoint = process.env.PROCESSOR_START_PIPELINE_ENDPOINT;
  if (_.isNil(pipelineEndpoint)) {
    throw new Error("No processor endpoint");
  }
  await callStartPipeline(pipelineEndpoint, process.env.AUTH_TOKEN);
  return {
    statusCode: 200,
    body: "ok",
  };
});
