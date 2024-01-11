import { test } from "@jest/globals";
import { config } from "dotenv";
import { CrawlManager } from "../manager";

config();

test("Test", async () => {
  const period = 1;
  const processorUrl = new URL(process.env.PROCESSOR_URL);
  processorUrl.port = process.env.PROCESSOR_PORT ?? "";
  const ocrUrl = new URL(process.env.OCR_URL);
  ocrUrl.port = process.env.OCR_PORT ?? "";
  const crawlManager = new CrawlManager({
    accountsSource: process.env.TWITTER_ACCOUNTS_SOURCE as "env" | "db",
    period,
    tweetCount: 20,
    processorUrl: processorUrl.toString(),
    ocrUrl: ocrUrl.toString(),
  });

  const sevenDaysAgo = new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000);

  const crawled = await crawlManager.crawl("from:@CC2Ventures", sevenDaysAgo, new Date(), 5, "TOP");
  console.log({crawled: JSON.stringify(crawled, null, 2)});
}, 60 * 1000);