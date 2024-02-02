import callerInstance from "../../services/callers/http_caller.js";
import { Tweet } from "../../types/tweet.js";
import axios from "axios";

export type StringOrNull = string | null;

async function getFinalUrl(url: string): Promise<string> {
  const response = await axios.get(url);
  return response.request.res.responseUrl;
}

function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

export abstract class FetchSummarizer {
  async fetchArticles(tweets: Tweet[]): Promise<StringOrNull[]> {
    const urls = await Promise.all(
      tweets.map(async (tweet) => {
        const extractedUrls = extractUrls(tweet.text);
        const finalUrls = await Promise.all(
          extractedUrls.map((url) => getFinalUrl(url)),
        );
        const actualUrls = finalUrls.filter(
          (url) =>
            !url.startsWith("https://twitter.com") ||
            !url.startsWith("https://x.com"),
        );
        return actualUrls[0] ?? null;
      }),
    );

    return callerInstance.fetchArticles(urls);
  }
  abstract summarizeTweetArticles(tweets: Tweet[]): Promise<StringOrNull[]>;
}