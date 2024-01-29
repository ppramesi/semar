import { SemarPostgres } from "./adapters/db/pg.js";
import { HttpSearchEngine } from "./services/server/http.js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import dotenv from "dotenv";
import pgPromise from "pg-promise";
import { SearchEngine } from "./services/engine.js";

dotenv.config();

const pgp = pgPromise();

async function connectWithRetry(
  maxRetries: number = 5,
  delayMillis: number = 5000,
) {
  let retries = maxRetries;

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

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const db = new SemarPostgres({
  postgresConnectionOptions: await connectWithRetry(),
  embeddings,
  embeddingDims: 1536,
});

await db.ensureTablesInDatabase();

const engine = new SearchEngine({ db });

const httpServer = new HttpSearchEngine({
  port: Number(process.env.SEARCH_ENGINE_PORT),
  engine
});

httpServer.buildRoute();
httpServer.startService();