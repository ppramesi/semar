import { deferrer, DeferredPromise } from "./utils/deferrer";
import dbInstance, { Database } from "./db";

type AuthStoreSource = "db" | "env";
type AuthSource = {
  source: string;
};

export class AuthStore {
  authSources: AuthSource[];
  type: AuthStoreSource;
  loadSourceDeferrer: DeferredPromise;
  db: Database;
  currentIndex: number = 0;
  sourceLoaded: boolean = false;
  constructor(type: AuthStoreSource) {
    this.type = type;
    this.authSources = [];
    this.loadSourceDeferrer = deferrer();
    this.db = dbInstance;
  }

  async loadSource() {
    this.currentIndex = 0;
    if (this.type === "db") {
      const authTokens = await this.db.getAuthTokens();
      this.authSources = authTokens.map((source) => ({ source }));
    } else if (this.type === "env") {
      const authSource = process.env.TWITTER_AUTH_TOKENS as string;
      this.authSources = authSource.split(",").map((source) => ({ source }));
    } else {
      throw new Error("Type not valid");
    }
  }

  async sourceLength() {
    await this.loadSourceDeferrer;
    return this.authSources.length;
  }

  async rotateAuth() {
    if (!this.sourceLoaded) {
      await this.loadSource()
        .then(() => {
          this.loadSourceDeferrer.resolve();
        })
        .catch(() => {
          this.loadSourceDeferrer.reject();
        });

      this.sourceLoaded = true;
    }

    await this.loadSourceDeferrer;
    const currentAuth = this.authSources[this.currentIndex];
    this.currentIndex++;

    if (this.currentIndex > this.authSources.length) {
      throw new Error("no-auth-left");
    }

    return currentAuth;
  }

  async getAuth() {
    if (!this.sourceLoaded) {
      await this.loadSource()
        .then(() => {
          this.loadSourceDeferrer.resolve();
        })
        .catch(() => {
          this.loadSourceDeferrer.reject();
        });

      this.sourceLoaded = true;
    }

    await this.loadSourceDeferrer;

    return this.authSources[this.currentIndex];
  }
}

export default new AuthStore(
  (process.env.TWITTER_AUTH_SOURCE as "db" | "env") ?? "env",
);
