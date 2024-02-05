import callerInstance, {
  HttpServiceCaller,
} from "../../services/callers/http_caller.js";
import { Tag } from "../../types/tag.js";
import { Tweet } from "../../types/tweet.js";
import { ClassifierAggregator } from "./base.js";

function removeUrls(inputText: string): string {
  // Regular expression to match URLs that start with https://
  const urlRegex = /https?:\/\/[^\s]+/g;

  // Replace matched URLs with an empty string
  let textWithoutUrls = inputText.replace(urlRegex, "");

  // Regular expression to replace double spaces (or more) with a single space
  const extraSpaceRegex = /\s{2,}/g;
  return textWithoutUrls.replace(extraSpaceRegex, " ");
}

export class ZeroShotClassifierAggregator extends ClassifierAggregator {
  serviceCaller: HttpServiceCaller = callerInstance;
  constructor() {
    super();
  }

  async preprocessTweets(tweets: Tweet[], tags: Tag[]): Promise<any> {
    const zeroShotResult = await this.serviceCaller.zeroShotClassification(
      tweets.map((t) => removeUrls(t.text)),
      tags.map((t) => t.tag),
    );

    return { zeroShotResult };
  }

  async testRelevancy(
    tweets: Tweet[],
    _tags: Tag[],
    extraOpts: { zeroShotResult: string[][] },
  ): Promise<Tweet[]> {
    return extraOpts.zeroShotResult.reduce((acc, result, idx) => {
      if (result.length > 0) {
        acc.push(tweets[idx]);
      }
      return acc;
    }, [] as Tweet[]);
  }

  async aggregateTweets(
    _tweets: Tweet[],
    originalTweets: Tweet[],
    extraOpts: { zeroShotResult: string[][] },
  ): Promise<Tweet[][]> {
    console.log(
      JSON.stringify(
        {
          originalTweets,
          extraOpts,
        },
        null,
        2,
      ),
    );
    return Object.values(
      extraOpts.zeroShotResult.reduce(
        (acc, tags, idx) => {
          tags.forEach((tag) => {
            if (!acc[tag]) {
              acc[tag] = [originalTweets[idx]];
            } else {
              acc[tag].push(originalTweets[idx]);
            }
          });
          return acc;
        },
        {} as Record<string, Tweet[]>,
      ),
    );
  }
}
