import { Callbacks } from "langchain/callbacks";
import { ArticleSummarizer } from "../../lc/chains/article_summarizer.js";
import { Tweet } from "../../types/tweet.js";
import { FetchSummarizer, StringOrNull } from "./base.js";
import { BaseLanguageModel } from "langchain/base_language";

export type LLMFetchSummarizerOpts = {
  llm: BaseLanguageModel;
  callbacks?: Callbacks;
};

export class LLMFetchSummarizer extends FetchSummarizer {
  summarizer: ArticleSummarizer;
  callbacks?: Callbacks;

  constructor(opts: LLMFetchSummarizerOpts) {
    super();

    this.summarizer = new ArticleSummarizer({
      llm: opts.llm,
    });
    this.callbacks = opts.callbacks;
  }

  async summarizeTweetArticles(tweets: Tweet[]): Promise<StringOrNull[]> {
    const articles = await this.fetchArticles(tweets);
    return Promise.all(
      articles.map(async (article) => {
        if (article === null) {
          return null;
        }

        const { text: result } = await this.summarizer.call(
          { article },
          { callbacks: this.callbacks },
        );
        return result as string;
      }),
    );
  }
}
