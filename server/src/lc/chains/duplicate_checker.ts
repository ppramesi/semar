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
import { JsonKeyOutputFunctionsParser } from "langchain/output_parsers";
import {
  DUPLICATE_CHECKER_PROMPT,
  DUPLICATE_CHECKER_SYSTEM_PROMPT,
} from "../prompts/duplicate_checker.js";
import { CallbackManagerForChainRun } from "@langchain/core/callbacks/manager";
import { ChainValues } from "@langchain/core/utils/types";

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
    inputVariables: ["summary", "tweets"],
  });

export type DuplicateCheckerOpts = {
  llm: BaseChatModel;
};

export class DuplicateChecker extends TweetChain {
  outputKey: string = keyName;
  constructor(opts: DuplicateCheckerOpts) {
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

  async _call(
    values: any,
    runManager?: CallbackManagerForChainRun | undefined,
  ): Promise<ChainValues> {
    const { duplicated } = await this._call(values, runManager);

    return { duplicated: duplicated === "true" };
  }
}
