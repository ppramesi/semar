import { Tweet } from "../../types/tweet.js";

export abstract class BaseServiceCaller {
  abstract zeroShotClassification(
    texts: string[],
    tags: string[],
  ): Promise<string[][]>;
  abstract crossEncoderRerank(
    basePassage: string,
    passages: string[],
  ): Promise<number[]>;
  abstract searchRelevantTweets(
    keywords: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<Tweet[]>;
  abstract scrapeTweets(): Promise<Tweet[]>;
  abstract summarizeText(text: string): Promise<string>;
  abstract fetchArticles(urls: string[]): Promise<(string | null)[]>;
}
