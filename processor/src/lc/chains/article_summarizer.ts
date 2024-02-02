import { LLMChain, StuffDocumentsChainInput } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { Callbacks } from "langchain/callbacks";
import {
  SUMMARIZER_PROMPT,
  SUMMARIZER_SYSTEM_PROMPT,
} from "../prompts/article_summarizer.js";
import { BaseLanguageModel } from "langchain/base_language";

export interface TweetSummarizerOpts {
  llm: BaseLanguageModel;
  summarizerOpts?: StuffDocumentsChainInput;
  callbacks?: Callbacks;
}

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(SUMMARIZER_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(SUMMARIZER_PROMPT),
    ],
    inputVariables: ["article"],
  });

export class ArticleSummarizer extends LLMChain {
  constructor(opts: TweetSummarizerOpts) {
    super({
      callbacks: opts.callbacks ?? [],
      llm: opts.llm,
      prompt: buildPrompt(),
    });
  }
}
