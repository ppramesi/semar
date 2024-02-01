import pgPromise, { IDatabase } from "pg-promise";
import { deferrer, DeferredPromise } from "./utils/deferrer";

export type ScrapeAccount = {
  id: string;
  name: string;
};

export class Database {
  pg: IDatabase<any>;
  initialized: boolean;
  initDeferrer: DeferredPromise;
  constructor() {
    this.initialized = false;
    this.initDeferrer = deferrer();
    this.initializeDatabase()
      .then(() => {
        this.initialized = true;
        this.initDeferrer.resolve();
      })
      .catch(() => {
        this.initDeferrer.reject();
      });
  }

  async initializeDatabase() {
    this.pg = await this.connectWithRetry();
  }

  async disconnect() {
    await this.pg.$pool.end();
  }

  async connectWithRetry(maxRetries: number = 5, delayMillis: number = 5000) {
    let retries = maxRetries;
    const pgp = pgPromise();

    while (retries > 0) {
      try {
        const pgpDb = pgp({
          host: process.env.POSTGRES_HOST,
          database: process.env.POSTGRES_DB,
          user: process.env.POSTGRES_USER,
          password: process.env.POSTGRES_PASSWORD,
          port: Number(process.env.POSTGRES_PORT),
          max: 20,
        });

        // Test the connection
        await pgpDb.connect();
        console.log("Database connection established.");
        return pgpDb;
      } catch (err) {
        console.error(
          "Failed to connect to the database. Retrying in",
          delayMillis,
          "ms",
        );
        console.error(err);
        retries--;
        await new Promise((resolve) => setTimeout(resolve, delayMillis));
      }
    }

    throw new Error("Failed to connect to the database after retries");
  }

  async fetchScrapeAccounts() {
    await this.initDeferrer;
    try {
      const result = await this.pg.manyOrNone<ScrapeAccount>(
        "SELECT * FROM scrape_accounts;",
      );
      return result;
    } catch (error) {
      console.error("Error fetching scrape accounts:", error);
      throw error;
    }
  }

  async ensureScrapeAccountsTable() {
    await this.initDeferrer;
    await this.pg.none(
      "CREATE TABLE IF NOT EXISTS scrape_accounts (id UUID NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY, account_name TEXT);",
    );
  }

  async getAuthTokens() {
    await this.initDeferrer;
    try {
      const results = await this.pg.manyOrNone<{ id: string; token: string }>(
        "SELECT * FROM auth_tokens;",
      );
      console.log("using twitter auths: ", { results });
      return results.map((t) => t.token);
    } catch (error) {
      console.error(error);
      throw error;
    }
  }
}

export default new Database();
