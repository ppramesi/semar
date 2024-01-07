import { test } from "@jest/globals";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import pgPromise, { IDatabase } from "pg-promise";
import { SemarPostgres } from "../../../adapters/db/pg.js";
import { deferrer } from "../../../utils/deferrer.js";
import dotenv from "dotenv";

dotenv.config();


// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pgvsPgvector: IDatabase<any>;
let semarPostgres: SemarPostgres;
let embeddings: OpenAIEmbeddings;

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

  embeddings = new OpenAIEmbeddings();
  semarPostgres = new SemarPostgres({
    postgresConnectionOptions: pgvsPgvector,
    embeddings,
    embeddingDims: 1536,
  });

  await semarPostgres.ensureTablesInDatabase();
  defer.resolve();
});

test("Process Test", async () => {
  await defer;
  const tags = await semarPostgres.fetchRelevancyTags();
  const tokens = await semarPostgres.fetchAuthTokens();
  const accounts = await semarPostgres.fetchScrapeAccounts();
  console.log({
    tags,
    tokens,
    accounts
  });

  expect(tags.length).toBeGreaterThan(0);
  expect(tokens.length).toBeGreaterThan(0);
  expect(accounts.length).toBeGreaterThan(0);
});
