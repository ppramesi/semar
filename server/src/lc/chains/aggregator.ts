// import { loadSummarizationChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { TweetChain } from "./base.js";
import {
  AGGREGATOR_PROMPT,
  AGGREGATOR_SYSTEM_PROMPT,
} from "../prompts/aggregator.js";
import { BaseChatModel } from "langchain/chat_models/base";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonKeyOutputFunctionsParser } from "langchain/output_parsers";

const keyName = "aggregated_tweets";

const outputSchema = z.object({
  [keyName]: z
    .array(
      z.array(z.string().describe("Tweet ID")).describe("Array of Tweet IDs"),
    )
    .describe("Array of arrays of Tweets grouped by topic/event"),
});

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(AGGREGATOR_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(AGGREGATOR_PROMPT),
    ],
    inputVariables: ["batch_number", "tweets"],
  });

export type AggregatorOpts = {
  llm: BaseChatModel;
};

export class TweetAggregator extends TweetChain {
  outputKey: string = keyName;
  constructor(opts: AggregatorOpts) {
    const functionName = "output_formatter";
    super({
      llm: opts.llm,
      prompt: buildPrompt(),
      outputParser: new JsonKeyOutputFunctionsParser({ attrName: keyName }),
      llmKwargs: {
        functions: [
          {
            name: functionName,
            description: `Output formatter. Should always be used to format your response to the user.`,
            parameters: zodToJsonSchema(outputSchema),
          },
        ],
        function_call: {
          name: functionName,
        },
      },
    });
  }
}
