import express, { Express, Request, Response } from "express";
import { CrawlManager } from "./manager"; // Assuming CrawlManager is in a separate file
import { Scheduler } from "./scheduler";

export type ServerOpts = {
  crawlManager: CrawlManager;
  scheduler: Scheduler;
};

export class Server {
  private app: Express;
  private crawlManager: CrawlManager;
  private scheduler: Scheduler;
  private started: boolean = false;

  constructor(serverOpts: ServerOpts) {
    this.app = express();
    this.app.use(express.json());
    this.crawlManager = serverOpts.crawlManager;
    this.scheduler = serverOpts.scheduler;
    this.setupRoutes();
  }

  private authMiddleware(req: Request, res: Response, next: () => void): void {
    const authToken = req.header("auth-token");
    if (!process.env.AUTH_TOKEN || process.env.AUTH_TOKEN !== authToken) {
      res.status(403).json({ status: "unauthorized" });
      return;
    }

    next();
  }

  private setupRoutes(): void {
    this.app.use(this.authMiddleware.bind(this));
    this.app.post(
      "/search-relevant-tweets",
      this.handleSearchTweets.bind(this)
    );
    this.app.post("/start", this.handleStart.bind(this));
    this.app.post("/pause", this.handlePause.bind(this));
    this.app.post("/unpause", this.handleUnpause.bind(this));
    this.app.post("/kill", this.handleKill.bind(this));
  }

  private async handleSearchTweets(req: Request, res: Response): Promise<void> {
    const { searchTerms, fromDate, toDate } = req.body;
    try {
      const data = await this.crawlManager.crawl(
        searchTerms,
        new Date(fromDate),
        new Date(toDate),
        5,
        "TOP"
      );
      res.status(200).json({ status: "success", data });
    } catch (error) {
      res.status(400).json({ status: "error", error: error.message });
    }
  }

  private async handleStart(_req: Request, res: Response): Promise<void> {
    if (!this.started) {
      await this.scheduler.startJob();
      this.started = true;
      res.status(200).json({ status: "started" });
    } else {
      res.status(200).json({ status: "already-started" });
    }
  }

  private handlePause(_req: Request, res: Response): void {
    this.scheduler.pause();
    res.status(200).json({ status: "paused" });
  }

  private handleUnpause(_req: Request, res: Response): void {
    this.scheduler.unpause();
    res.status(200).json({ status: "unpaused" });
  }

  private handleKill(_req: Request, res: Response): void {
    this.scheduler.endScheduler();
    res.status(200).json({ status: "terminated" });
    process.exit(0);
  }

  public listen(port: number | string): void {
    this.app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}
