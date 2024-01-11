import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TweetChain } from "./base.js";
import {
  RELEVANCY_PROMPT,
  RELEVANCY_SYSTEM_PROMPT,
} from "../prompts/relevancy.js";
import { BaseChatModel } from "langchain/chat_models/base";
import { UnbrittledKeyOutputFunctionParser } from "../parsers/function_output_parser.js";

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
    inputVariables: ["batch_size", "tweets", "topics"],
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
      outputParser: new UnbrittledKeyOutputFunctionParser({
        attrName: keyName,
      }),
      llmKwargs: {
        functions: [
          {
            name: functionName,
            description: `Output formatter. Should always be used to format your response to the user. The output should be formatted correctly such that it can be parsed using Javascript's JSON.parse(). Mind the trailing commas.`,
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
