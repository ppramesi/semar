import { StuffDocumentsChainInput } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { TweetChain } from "./base.js";
import { Callbacks } from "langchain/callbacks";
import {
  SUMMARIZER_PROMPT,
  SUMMARIZER_SYSTEM_PROMPT,
} from "../prompts/tweet_summarizer.js";
import { BaseChatModel } from "langchain/chat_models/base";

export interface TweetSummarizerOpts {
  llm: BaseChatModel;
  summarizerOpts?: StuffDocumentsChainInput;
  callbacks?: Callbacks;
}

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(SUMMARIZER_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(SUMMARIZER_PROMPT),
    ],
    inputVariables: ["batch_size", "tweets", "context_tweets"],
  });

export class TweetSummarizer extends TweetChain {
  constructor(opts: TweetSummarizerOpts) {
    super({
      callbacks: opts.callbacks ?? [],
      llm: opts.llm,
      prompt: buildPrompt(),
    });
  }
}
