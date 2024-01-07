import { config } from "dotenv"; 
import { Scheduler, createRecurrenceRule } from "./scheduler";
import { RunManager } from "./manager";
import http from "http";
import url from "url";

config();

async function run(){
  try {
    let started = false;
    const period = 1;
    const runManager = new RunManager({
      accessToken: process.env.ACCESS_TOKEN,
      accountsSource: process.env.ACCOUNTS_SOURCE as "env" | "db",
      period,
      tweetCount: 20,
      processorUrl: process.env.TWEET_PROCESSOR_URL
    });
    const scheduler = new Scheduler({
      runManager,
      rule: createRecurrenceRule(period)
    });
    const server = http.createServer(async (req, res) => {
      if (req.method === "POST") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end(JSON.stringify({status: "use-get-instead"}));
        return;
      }
      const pathname = url.parse(req.url).pathname;
      try {
        if (pathname === "/start") {
          if (!started) {
            await scheduler.startJob();
            started = true;
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end(JSON.stringify({status: "started"}));
            return;
          } else {
            res.writeHead(200, {"Content-Type": "text/plain"});
            res.end(JSON.stringify({status: "already-started"}));
            return;
          }
        } else if (pathname === "/pause") {
          scheduler.pause();
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify({status: "paused"}));
          return;
        } else if (pathname === "/unpause") {
          scheduler.unpause();
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify({status: "unpaused"}));
          return;
        } else if (pathname === "/kill") {
          scheduler.endScheduler();
          server.close();
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify({status: "terminated"}));
          process.exit(0);
        } else {
          res.writeHead(200, {"Content-Type": "text/plain"});
          res.end(JSON.stringify({status: "hello"}));
          return;
        }
      } catch (error) {
        res.writeHead(403, {"Content-Type": "text/plain"});
        res.end(JSON.stringify({status: "error", error}));
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

run()
  .catch(() => {
    process.exit(1);
  });