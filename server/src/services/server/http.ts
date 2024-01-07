import express, { Express, NextFunction, Response, Request } from "express";
import { SemarServer, SemarServerOpts } from "./base.js";
import { Tweet } from "../../types/tweet.js";
import _, { isNil } from "lodash";

interface SemarHttpServerOpts extends SemarServerOpts {
  port: number;
}

function buildAuthMiddleware(baseAuthToken?: string) {
  return function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (isNil(baseAuthToken)) {
      next();
    }
    const authToken = req.header("auth-token");
    if (authToken !== baseAuthToken) {
      res.status(403).send({ status: "unauthorized" });
      return;
    }

    next();
  };
}

export class SemarHttpServer extends SemarServer {
  port: number;
  app: Express;
  constructor(opts: SemarHttpServerOpts) {
    super(opts);
    this.app = express();
    this.port = opts.port;
  }

  buildRoute(): void {
    this.app.use(buildAuthMiddleware(process.env.AUTH_TOKEN));
    this.app.use(express.json());
    this.app.post("/process-tweets", async (req, res) => {
      let tweets: Tweet[];
      const { tweets: rawTweets, ids } = req.body as {
        tweets: Tweet[];
        ids: string[];
      };
      console.log({ rawTweets });
      if (!_.isNil(rawTweets) && !_.isNil(ids)) {
        res.status(400).send({
          status: "error",
          error: new Error("either tweet obs or ids"),
        });
      }

      if (!_.isNil(ids)) {
        tweets = await Promise.all(ids.map(this.db.fetchTweet));
      } else if (!_.isNil(rawTweets)) {
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
        console.error(error);
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
