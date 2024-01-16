import {
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { TweetChain } from "./base.js";
import {
  GENERATE_TAGS_PROMPT,
  GENERATE_TAGS_SYSTEM_PROMPT,
} from "../prompts/generate_tags.js";
import { BaseChatModel } from "langchain/chat_models/base";
import { UnbrittledKeyOutputFunctionParser } from "../parsers/function_output_parser.js";
import { Callbacks } from "langchain/callbacks";

const keyName = "extracted_tags";

const outputSchema = z.object({
  [keyName]: z
    .array(z.array(z.string().describe("Extracted tags from the tweets.")))
    .describe(
      "The array containing tags for each tweet. The length of this array should be the same as the number of tweets.",
    ),
});

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(GENERATE_TAGS_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(GENERATE_TAGS_PROMPT),
    ],
    inputVariables: ["batch_size", "tweets"],
  });

export type TagGeneratorOpts = {
  llm: BaseChatModel;
  callbacks?: Callbacks;
};

export class TagGenerator extends TweetChain {
  outputKey: string = keyName;

  constructor(opts: TagGeneratorOpts) {
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
}
