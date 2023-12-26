import { SemarPostgres } from "./adapters/db/pg.js";
import { SemarHttpServer } from "./services/server/http.js";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { ChatOpenAI } from "langchain/chat_models/openai";
import dotenv from "dotenv";
import pgPromise from "pg-promise";

dotenv.config();

const pgp = pgPromise();
const pgpDb = pgp({
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  port: Number(process.env.POSTGRES_PORT),
  max: 20,
});

const embeddings = new OpenAIEmbeddings();

const llm35 = new ChatOpenAI({
  modelName: "gpt-3.5-turbo",
  maxConcurrency: 5,
  temperature: 0.2,
});

const db = new SemarPostgres({
  postgresConnectionOptions: pgpDb,
  embeddings,
  embeddingDims: 1536,
});

const server = new SemarHttpServer({
  db,
  llm: llm35,
  embeddings,
  port: parseInt(process.env.HTTPS_SERVER_PORT!) ?? 42069,
});

server.startService();
