import { config } from "dotenv";
import { Scheduler, createRecurrenceRule } from "./scheduler";
import { CrawlManager } from "./manager";
import http from "http";
import url from "url";
import _ from "lodash";

config();

async function run() {
  try {
    let started = false;
    const period = 1;
    const crawlManager = new CrawlManager({
      accountsSource: process.env.TWITTER_ACCOUNTS_SOURCE as "env" | "db",
      period,
      tweetCount: 20,
      processorUrl: process.env.TWEET_PROCESSOR_URL,
    });
    const scheduler = new Scheduler({
      runManager: crawlManager,
      rule: createRecurrenceRule(period),
    });
    const server = http.createServer(async (req, res) => {
      const auth = req.headers["auth-token"];

      if (
        !_.isNil(process.env.AUTH_TOKEN) &&
        (process.env.AUTH_TOKEN as string).length > 0 &&
        process.env.AUTH_TOKEN !== auth
      ) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end(JSON.stringify({ status: "unauthorized" }));
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end(JSON.stringify({ status: "use-post-instead" }));
        return;
      }

      const pathname = url.parse(req.url).pathname;
      try {
        if (pathname === "/search-relevant-tweets") {
          let bodyData: {
            searchTerms: string;
            fromDate: string;
            toDate: string;
          };
          try {
            const body = await new Promise<string>((resolve, reject) => {
              let body = "";
              req.on("data", (chunk) => {
                body += chunk;
              });
              req.on("end", () => {
                resolve(body);
              });
              req.on("error", (error) => {
                reject(error);
              });
            });
            bodyData = JSON.parse(body);
          } catch (error) {
            res.writeHead(400, { "Content-Type": "text/plain" });
            res.end(JSON.stringify({ status: "invalid-body" }));
            return;
          }
          let { searchTerms, fromDate, toDate } = bodyData;
          const data = await crawlManager.crawl(
            searchTerms,
            new Date(fromDate),
            new Date(toDate),
            5,
            "TOP",
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "success", data }));
          return;
        } else if (pathname === "/start") {
          if (!started) {
            await scheduler.startJob();
            started = true;
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(JSON.stringify({ status: "started" }));
            return;
          } else {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end(JSON.stringify({ status: "already-started" }));
            return;
          }
        } else if (pathname === "/pause") {
          scheduler.pause();
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(JSON.stringify({ status: "paused" }));
          return;
        } else if (pathname === "/unpause") {
          scheduler.unpause();
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(JSON.stringify({ status: "unpaused" }));
          return;
        } else if (pathname === "/kill") {
          scheduler.endScheduler();
          server.close();
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(JSON.stringify({ status: "terminated" }));
          process.exit(0);
        } else {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(JSON.stringify({ status: "hello" }));
          return;
        }
      } catch (error) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end(JSON.stringify({ status: "error", error }));
        return;
      }
    });

    server.listen(process.env.HARVESTER_PORT, () => {
      console.log(`Listening at port ${process.env.HARVESTER_PORT}`);
    });
  } catch (error) {
    console.error(error);
  }
}

run().catch(() => {
  process.exit(1);
});
