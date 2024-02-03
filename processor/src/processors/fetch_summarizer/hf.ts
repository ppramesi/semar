import callerInstance from "../../services/callers/http_caller.js";
import { Tweet } from "../../types/tweet.js";
import { FetchSummarizer, StringOrNull } from "./base.js";

export class HuggingFaceFetchSummarizer extends FetchSummarizer {
  async summarizeTweetArticles(tweets: Tweet[]): Promise<StringOrNull[]> {
    const articles = await this.fetchArticles(tweets);
    return this.batchedSendRequest(articles);
  }

  async batchedSendRequest(texts: StringOrNull[], batchSize: number = 10) {
    const summarizedTexts: StringOrNull[] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (text) => {
          if (text === null) {
            return null;
          }
          console.log({ text });
          const summarized = await callerInstance.summarizeText(text);
          console.log({ summarized });
          return summarized;
        }),
      );
      summarizedTexts.push(...results);
    }

    return summarizedTexts;
  }
}
