import { test } from "@jest/globals";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import pgPromise, { IDatabase } from "pg-promise";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { SemarServer } from "../base.js";
import { SemarPostgres } from "../../../adapters/db/pg.js";
import { Tweet } from "../../../types/tweet.js";
import { deferrer } from "../../../utils/deferrer.js";
import { ZeroShotClassifierAggregator } from "../../../processors/classifier_aggregator/zero_shot.js";
import { v4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

class DummySemarServer extends SemarServer {
  buildRoute(): void {
    throw new Error("Method not implemented.");
  }
  startService(): void {
    throw new Error("Method not implemented.");
  }
}

function hoursAgo(hours: number): Date {
  const now = new Date();
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

const tweets: Tweet[] = [
  {
    id: v4(),
    text: `Ohio’s Republican Gov. Mike DeWine vetoes legislation that would have barred transgender youth from receiving gender-affirming care`,
    date: hoursAgo(14.2),
    url: `https://twitter.com/CNN/status/1740773713295905066`,
  },
  {
    id: v4(),
    text: `122 fishermen have been rescued from an ice floe on Upper Red Lake in Minnesota, no injuries have been reported.`,
    date: hoursAgo(24),
    url: `https://twitter.com/CNN/status/1740935416683839776`,
  },
  {
    id: v4(),
    text: `Over 100 fishermen were rescued after an ice floe detached in a northern Minnesota lake, according to police. No injuries were reported from the rescue.`,
    date: hoursAgo(24.1),
    url: `https://twitter.com/ABC/status/1740937109723025503`,
  },
  {
    id: v4(),
    text: `North Dakota governor declares emergency for ice storm that left thousands without power.`,
    date: hoursAgo(8.1),
    url: `https://twitter.com/AP/status/1740900804729430175`,
  },
  {
    id: v4(),
    text: `North Dakota Gov. Doug Burgum declared a statewide emergency in response to an ice storm that felled power lines, leaving more than 20,000 people without electricity.`,
    date: hoursAgo(8.1),
    url: `https://twitter.com/ABC/status/1740879304416722970`,
  },
  {
    id: v4(),
    text: `Republican Gov. Mike DeWine vetoed a measure Friday that would have banned gender-affirming care for minors in Ohio. The bill also would have banned transgender athletes’ participation in girls’ and women’s sports.`,
    date: hoursAgo(14.1),
    url: `https://twitter.com/AP/status/1740839375015932343`,
  },
  {
    id: v4(),
    text: `Up to 100 ice fisherman were stranded on an ice floe in Upper Red Lake on Friday evening, the latest in a series of thin ice-related emergencies this month.`,
    date: hoursAgo(24.2),
    url: `https://twitter.com/StarTribune/status/1740930781910811122`,
  },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pgvsPgvector: IDatabase<any>;
let semarServer: DummySemarServer;
let semarPostgres: SemarPostgres;
let embeddings: OpenAIEmbeddings;
let llm35: ChatOpenAI;

const defer = deferrer();

if (
  !process.env.POSTGRES_HOST ||
  !process.env.POSTGRES_DB ||
  !process.env.POSTGRES_USER ||
  !process.env.POSTGRES_PASSWORD ||
  !process.env.POSTGRES_PORT
) {
  throw new Error("PGVECTOR environment variables not set");
}

beforeEach(async () => {
  const pgp = pgPromise();
  pgvsPgvector = pgp({
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: Number(process.env.POSTGRES_PORT),
    max: 20,
  });

  await Promise.all([
    pgvsPgvector.none("DROP TABLE IF EXISTS summaries"),
    pgvsPgvector.none("DROP TABLE IF EXISTS tweets"),
  ]);

  embeddings = new OpenAIEmbeddings();
  semarPostgres = new SemarPostgres({
    postgresConnectionOptions: pgvsPgvector,
    embeddings,
    embeddingDims: 1536,
  });

  await semarPostgres.ensureTablesInDatabase();

  llm35 = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    maxConcurrency: 5,
    temperature: 0.2,
  });

  semarServer = new DummySemarServer({
    db: semarPostgres,
    embeddings,
    baseLlm: llm35,
    classifierAggregator: new ZeroShotClassifierAggregator(),
  });
  defer.resolve();
});

test(
  "Process Test",
  async () => {
    await defer;
    await semarServer.processTweets(tweets);
    const summaries = await semarServer.db.fetchSummaries();
    console.log({ summaries });
  },
  1000 * 60 * 60,
);
