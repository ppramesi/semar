import {
  // BaseChain,
  ChainInputs,
  // StuffDocumentsChain,
  StuffDocumentsChainInput,
} from "langchain/chains";
// import { loadSummarizationChain } from "langchain/chains";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { TweetChain } from "./base.js";
import {
  SUMMARIZER_PROMPT,
  SUMMARIZER_SYSTEM_PROMPT,
} from "../prompts/summarizer.js";
import { BaseChatModel } from "langchain/chat_models/base";

export interface TweetSummarizerOpts extends ChainInputs {
  llm: BaseChatModel;
  summarizerOpts?: StuffDocumentsChainInput;
}

const buildPrompt = () =>
  new ChatPromptTemplate({
    promptMessages: [
      SystemMessagePromptTemplate.fromTemplate(SUMMARIZER_SYSTEM_PROMPT),
      HumanMessagePromptTemplate.fromTemplate(SUMMARIZER_PROMPT),
    ],
    inputVariables: ["batch_number", "tweets"],
  });

export class TweetSummarizer extends TweetChain {
  constructor(opts: TweetSummarizerOpts) {
    super({ llm: opts.llm, prompt: buildPrompt() });
  }
}
