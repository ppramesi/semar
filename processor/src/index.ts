import { SemarPostgres } from "./adapters/db/pg.js";
import { SemarHttpServer } from "./services/server/http.js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import dotenv from "dotenv";
import pgPromise from "pg-promise";
import { Client } from "langsmith";
import { LangChainTracer } from "langchain/callbacks";
import _ from "lodash";
// import { TweetSummarizer } from "./lc/chains/summarizer.js";
import { ClassifierAggregator } from "./processors/classifier_aggregator/base.js";
import { ZeroShotClassifierAggregator } from "./processors/classifier_aggregator/hf.js";
import { LLMClassifierAggregator } from "./processors/classifier_aggregator/llm.js";

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

const modelCallbacks = [];
if (
  !_.isEmpty(process.env.LANGSMITH_API_KEY) &&
  !_.isEmpty(process.env.LANGSMITH_PROJECT_NAME)
) {
  const client = new Client({
    apiUrl: "https://api.smith.langchain.com",
    apiKey: process.env.LANGSMITH_API_KEY,
  });

  const tracer = new LangChainTracer({
    projectName: process.env.LANGSMITH_PROJECT_NAME,
    client: client as Client,
  });
  modelCallbacks.push(tracer);
}

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

const llm35 = new ChatOpenAI({
  modelName: "gpt-3.5-turbo-1106",
  maxConcurrency: 5,
  temperature: 0.1,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// const llm4 = new ChatOpenAI({
//   modelName: "gpt-4-1106-preview",
//   maxConcurrency: 5,
//   temperature: 0.1,
//   openAIApiKey: process.env.OPENAI_API_KEY,
// });

const db = new SemarPostgres({
  postgresConnectionOptions: await connectWithRetry(),
  embeddings,
  embeddingDims: 1536,
});

await db.ensureTablesInDatabase();

let classifierAggregator: ClassifierAggregator;
if (process.env.CLASSIFIER_AGGREGATOR === "hf") {
  classifierAggregator = new ZeroShotClassifierAggregator();
} else if (process.env.CLASSIFIER_AGGREGATOR === "llm") {
  classifierAggregator = new LLMClassifierAggregator({
    baseLlm: llm35,
    callbacks: modelCallbacks,
  });
} else {
  throw new Error("Classifier aggregator not set");
}

const server = new SemarHttpServer({
  db,
  baseLlm: llm35,
  // llms: new Map([[TweetSummarizer, llm4]]),
  embeddings,
  port: parseInt(process.env.PROCESSOR_PORT!) ?? 42069,
  callbacks: modelCallbacks,
  classifierAggregator,
});
process.on("SIGTERM", async () => {
  await db.disconnect();
  process.exit(0);
});

server.buildRoute();
server.startService();
