import { config } from "dotenv";
// import { Scheduler, createRecurrenceRule } from "./scheduler";
import { CrawlManager } from "./manager";
import _ from "lodash";
import { Server } from "./server";

config();

async function run() {
  try {
    const period = 1;
    const processorUrl = new URL(process.env.PROCESSOR_URL);
    processorUrl.port = process.env.PROCESSOR_PORT ?? "";
    const imageRecognitionUrl = new URL(process.env.IR_URL);
    imageRecognitionUrl.port = process.env.IR_PORT ?? "";
    const crawlManager = new CrawlManager({
      accountsSource: process.env.TWITTER_ACCOUNTS_SOURCE as "env" | "db",
      period,
      tweetCount: 20,
      processorUrl: processorUrl.toString(),
      imageRecognitionUrl: imageRecognitionUrl.toString(),
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
