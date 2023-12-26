import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JsonKeyOutputFunctionsParser } from "langchain/output_parsers";
import { TweetChain } from "./base.js";
import {
  RELEVANCY_PROMPT,
  RELEVANCY_SYSTEM_PROMPT,
} from "../prompts/relevancy.js";
import { BaseChatModel } from "langchain/chat_models/base";

const keyName = "relevant_tweets";

const outputSchema = z.object({
  [keyName]: z.array(z.string()).describe("Array of relevant tweet IDs"),
});

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(RELEVANCY_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(RELEVANCY_PROMPT),
    ],
    inputVariables: ["batch_number", "tweets", "topic"],
  });

export type RelevancyOpts = {
  llm: BaseChatModel;
};

export class TweetRelevancyEvaluator extends TweetChain {
  outputKey: string = keyName;
  constructor(opts: RelevancyOpts) {
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
