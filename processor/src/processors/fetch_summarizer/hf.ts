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
        batch.map((text) => {
          if (text === null) {
            return null;
          }
          return callerInstance.summarizeText(text);
        }),
      );
      summarizedTexts.push(...results);
    }

    return summarizedTexts;
  }
}
