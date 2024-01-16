// import { loadSummarizationChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { TweetChain } from "./base.js";
import { BaseChatModel } from "langchain/chat_models/base";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  DUPLICATE_CHECKER_PROMPT,
  DUPLICATE_CHECKER_SYSTEM_PROMPT,
} from "../prompts/duplicate_checker.js";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";
import { UnbrittledKeyOutputFunctionParser } from "../parsers/function_output_parser.js";
import { Callbacks } from "langchain/callbacks";

const keyName = "duplicated";

const outputSchema = z.object({
  [keyName]: z
    .string()
    .describe(
      'Whether the tweets and the summary are about the same thing. Should be "true" or "false".',
    ),
});

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(DUPLICATE_CHECKER_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(DUPLICATE_CHECKER_PROMPT),
    ],
    inputVariables: ["summary", "tweets", "summary_date"],
  });

export type DuplicateCheckerOpts = {
  llm: BaseChatModel;
  callbacks?: Callbacks;
};

export class DuplicateChecker extends TweetChain {
  outputKey: string = keyName;
  constructor(opts: DuplicateCheckerOpts) {
    const functionName = "output_formatter";
    super({
      callbacks: opts.callbacks ?? [],
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

  async _call(
    values: any,
    runManager?: CallbackManagerForChainRun | undefined,
  ): Promise<ChainValues> {
    const { duplicated } = await super._call(values, runManager);

    return { duplicate: duplicated === "true" };
  }
}
