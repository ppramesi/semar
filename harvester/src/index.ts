import { config } from "dotenv";
// import { Scheduler, createRecurrenceRule } from "./scheduler";
import { CrawlManager } from "./manager";
import _ from "lodash";
import { Server } from "./server";

config();

async function run() {
  try {
    const period = 1;

    const crawlManager = new CrawlManager({
      accountsSource: process.env.TWITTER_ACCOUNTS_SOURCE as "env" | "db",
      period,
      tweetCount: 20,
    });

    const server = new Server({
      crawlManager,
    });
    server.listen(process.env.HARVESTER_PORT ?? 2222);
  } catch (error) {
    console.error(error);
  }
}

run().catch(() => {
  process.exit(1);
});
