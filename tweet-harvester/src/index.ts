import { config } from "dotenv"; 
import { Scheduler, createRecurrenceRule } from "./scheduler";
import { RunManager } from "./manager";
import http from "http";
import url from "url";

config();

async function run(){
  try {
    const period = 1;
    const runManager = new RunManager({
      accessToken: process.env.ACCESS_TOKEN,
      accountsSource: "ENV",
      period: 1,
      tweetCount: 20,
      processorUrl: process.env.TWEET_PROCESSOR_URL
    });
    const scheduler = new Scheduler({
      runManager,
      rule: createRecurrenceRule(period)
    });
    await scheduler.startJob();
    const server = http.createServer((req, res) => {
      const pathname = url.parse(req.url).pathname;
      if (pathname === "/pause") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end(JSON.stringify({status: "paused"}));
        scheduler.pause();
      } else if (pathname === "/unpause") {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end(JSON.stringify({status: "unpaused"}));
        scheduler.unpause();
      } else {
        res.writeHead(200, {"Content-Type": "text/plain"});
        res.end(JSON.stringify({status: "terminated"}));
        scheduler.endJob();
        server.close();
        process.exit(0);
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