import express, { Express, NextFunction, Request, Response } from "express";
import _ from "lodash";
import { SearchEngineServer, SearchEngineOptions } from "./base.js";

interface HttpSearchEngineOptions extends SearchEngineOptions {
  port: number;
}

function buildAuthMiddleware(baseAuthToken?: string) {
  return function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    if (_.isNil(baseAuthToken)) {
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

export class HttpSearchEngine extends SearchEngineServer {
  port: number;
  app: Express;
  constructor(opts: HttpSearchEngineOptions) {
    super(opts);
    this.app = express();
    this.port = opts.port;
  }

  buildRoute(): void {
    this.app.use(buildAuthMiddleware(process.env.AUTH_TOKEN));
    this.app.use(express.json());
    this.app.post("/semantic-search", this.handleSearch.bind(this));
  }

  private async handleSearch(req: Request, res: Response) {
    const { query, offset, limit } = req.body as {
      query: string;
      offset?: number;
      limit?: number;
    };
    try {
      const summaries = await this.engine.search(query, offset, limit);
      res.status(200).send({ status: "success", result: summaries });
      return;
    } catch (error) {
      console.error(error);
      res.status(400).send({ status: "error", error });
      return;
    }
  }

  async startService(): Promise<void> {
    this.buildRoute();
    this.app.listen(this.port, () => {
      console.log(
        `Search engine is listening at http://localhost:${this.port}`,
      );
    });
  }
}
