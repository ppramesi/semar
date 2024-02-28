import { test } from "@jest/globals";
import { config } from "dotenv";
import { CrawlManager } from "../manager.js";

config();

test(
  "Test",
  async () => {
    const period = 1;
    const crawlManager = new CrawlManager({
      accountsSource: process.env.TWITTER_ACCOUNTS_SOURCE as "env" | "db",
      period,
      tweetCount: 20,
    });

    const anHourAgo = new Date(new Date().getTime() - 60 * 60 * 1000);

    const crawled = await crawlManager.crawl(
      "from:@ap",
      anHourAgo,
      new Date(),
      5,
      "TOP",
    );
    console.log({ crawled: JSON.stringify(crawled, null, 2) });
  },
  60 * 1000,
);
