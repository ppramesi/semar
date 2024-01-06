import { deferrer, DeferredPromise } from "./utils/deferrer";
import dbInstance, { Database } from "./db";

type AuthStoreSource = "db" | "env";
type AuthSource = {
  source: string;
};

class AuthStore {
  authSources: AuthSource[];
  type: AuthStoreSource;
  loadSourceDeferrer: DeferredPromise;
  db: Database;
  currentIndex: number = 0;
  constructor(type: AuthStoreSource){
    this.type = type;
    this.authSources = [];
    this.loadSourceDeferrer = deferrer();
    this.db = dbInstance;
    this.loadSource()
      .then(() => {
        this.loadSourceDeferrer.resolve();
      })
      .catch(() => {
        this.loadSourceDeferrer.reject();
      });
  }

  private async loadSource(){
    if (this.type === "db") {
      const authTokens = await this.db.getAuthTokens();
      this.authSources = authTokens.map(source => ({ source }));
    } else if (this.type === "env") {
      const authSource = process.env.AUTH_TOKENS as string;
      this.authSources = authSource.split(",").map(source => ({ source }));
    } else {
      throw new Error("Type not valid");
    }
  }

  async rotateAuth(){
    await this.loadSourceDeferrer;
    const currentAuth = this.authSources[this.currentIndex];
    this.currentIndex++;

    if (this.currentIndex > this.authSources.length) {
      throw new Error("Ran out of auth :(");
    }

    return currentAuth;
  }

  async getAuth(){
    await this.loadSourceDeferrer;

    return this.authSources[this.currentIndex];
  }
}

export default new AuthStore(process.env.AUTH_SOURCE as "db" | "env" ?? "env");