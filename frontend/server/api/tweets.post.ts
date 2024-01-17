import { defineEventHandler, readBody } from "h3";
import pgInstance from "../../lib/db";
import { RawTweet, Tweet } from "~/types/tweet";

export default defineEventHandler(async (event) => {
  try {
    let rawTweets: RawTweet[];
    const body = await readBody(event);
    let tweetIds: string[] = [];
    try {
      tweetIds = JSON.parse(body ?? "[]");
    } catch (error) {
      tweetIds = [];
    }

    if (tweetIds && tweetIds.length > 0) {
      // Fetch tweets by a list of IDs
      rawTweets = await pgInstance.manyOrNone<RawTweet>(
        "SELECT id, date, tags, text, url FROM tweets WHERE id = ANY($1::uuid[]) ORDER BY date DESC",
        [tweetIds]
      );
    } else {
      // Fetch all tweets when no IDs are provided
      rawTweets = await pgInstance.manyOrNone<RawTweet>("SELECT id, date, tags, text, url FROM tweets ORDER BY date DESC");
    }

    const tweet: Tweet[] = rawTweets.map((tweet) => {
      return {
        ...tweet,
        tags: JSON.parse(tweet.tags ?? "[]")
      };
    });

    return tweet;
  } catch (error) {
    event.node.res.statusCode = 500;
    return { error: (error as Error).message };
  }
});
