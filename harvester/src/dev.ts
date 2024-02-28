import { crawl } from "./crawl.js";
import { ACCESS_TOKEN } from "./utils/env.js";

crawl({
  ACCESS_TOKEN: ACCESS_TOKEN!,
  SEARCH_KEYWORDS: `gibran lang:id`,
  // TWEET_THREAD_URL: "https://twitter.com/pangeransiahaan/status/1690590234009112576",
  TARGET_TWEET_COUNT: 1500,
  OUTPUT_FILENAME: "gibran.csv",
  DELAY_EACH_TWEET_SECONDS: 0.1,
  DELAY_EVERY_100_TWEETS_SECONDS: 0,
  SEARCH_TAB: "TOP",
});
