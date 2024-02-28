import express, { Express, Request, Response } from "express";
import { CrawlManager, TweetCrawlerOutput } from "./manager.js"; // Assuming CrawlManager is in a separate file
import _ from "lodash";
import PQueueMod from "p-queue";

export type ServerOpts = {
  crawlManager: CrawlManager;
};

export class Server {
  private app: Express;
  private crawlManager: CrawlManager;
  private queue: (typeof import("p-queue"))["default"]["prototype"];

  constructor(serverOpts: ServerOpts) {
    const PQueue = "default" in PQueueMod ? PQueueMod.default : PQueueMod;
    this.queue = new (PQueue as typeof PQueueMod)({ concurrency: 2 });
    this.app = express();
    this.app.use(express.json());
    this.crawlManager = serverOpts.crawlManager;
    this.setupRoutes();
  }

  private authMiddleware(req: Request, res: Response, next: () => void): void {
    const authToken = req.header("auth-token");
    if (
      !_.isNil(process.env.AUTH_TOKEN) &&
      process.env.AUTH_TOKEN.length > 0 &&
      process.env.AUTH_TOKEN !== authToken
    ) {
      res.status(403).json({ status: "unauthorized" });
      return;
    }

    next();
  }

  private setupRoutes(): void {
    this.app.use(this.authMiddleware.bind(this));
    this.app.post(
      "/search-relevant-tweets",
      this.handleSearchTweets.bind(this),
    );
    this.app.post("/scrape-tweets", this.handleScrapeTweets.bind(this));
  }

  private async handleScrapeTweets(
    _req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const tweets = (await this.queue.add(() =>
        this.crawlManager.crawlWithSearch(),
      )) as TweetCrawlerOutput[];
      // const tweets = await this.crawlManager.crawlWithSearch();
      res.status(200).json({ status: "success", tweets });
      return;
    } catch (error) {
      console.error(error);
      res.status(400).json({ status: "error", error: error.message });
      return;
    }
  }

  private async handleSearchTweets(req: Request, res: Response): Promise<void> {
    const { searchTerms, fromDate, toDate } = req.body;
    try {
      const tweets = (await this.queue.add(() =>
        this.crawlManager.crawl(
          searchTerms,
          new Date(fromDate),
          new Date(toDate),
          5,
          "TOP",
          process.env.USE_IR === "true",
        ),
      )) as TweetCrawlerOutput[];
      // const tweets = await this.crawlManager.crawl(
      //   searchTerms,
      //   new Date(fromDate),
      //   new Date(toDate),
      //   5,
      //   "TOP",
      //   process.env.USE_IR === "true",
      // );
      res.status(200).json({ status: "success", tweets });
      return;
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
      return;
    }
  }

  public listen(port: number | string): void {
    this.app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
