import express, { Express } from "express";
import SemarServer, { SemarServerOpts } from "./base.js";
import { Tweet } from "../../types/tweet.js";
import { isNil } from "lodash";

interface SemarHttpServerOpts extends SemarServerOpts {
  port: number;
}

export class SemarHttpServer extends SemarServer {
  port: number;
  app: Express;
  constructor(opts: SemarHttpServerOpts) {
    super(opts);
    this.app = express();
    this.app.use(express.json());
    this.port = opts.port;
  }

  buildRoute(): void {
    this.app.post("/process-tweets", async (req, res) => {
      let tweets: Tweet[];
      const { tweets: rawTweets, ids } = req.body as {
        tweets: Tweet[];
        ids: string[];
      };
      if (!isNil(rawTweets) && !isNil(ids)) {
        res
          .status(400)
          .send({
            status: "error",
            error: new Error("either tweet obs or ids"),
          });
      }

      if (!isNil(ids)) {
        tweets = await Promise.all(ids.map(this.db.fetchTweet));
      } else if (!isNil(rawTweets)) {
        tweets = rawTweets;
      } else {
        res
          .status(400)
          .send({ status: "error", error: new Error("empty params") });
        return;
      }

      try {
        await this.processTweets(tweets);
        res.status(200).send({ status: "success" });
        return;
      } catch (error) {
        res.status(400).send({ status: "error", error });
        return;
      }
    });
  }

  startService(): void {
    this.app.listen(this.port, () => {
      console.log(`Semar Http server started on port ${this.port}`);
    });
  }
}
