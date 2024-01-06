import pgPromise, { IBaseProtocol, IDatabase } from "pg-promise";
import {
  PGFilterWithJoin,
  PGNoneExt,
  PGVectorStore,
} from "../../lc/vectorstores/pg.js";
import { Summary, Tweet } from "../../types/tweet.js";
import { User } from "../../types/user.js";
import { Embeddings } from "langchain/embeddings/base";
import { Document } from "langchain/document";
import _ from "lodash";

interface CoreColumns {
  id: string;
  pageContentColumn: string;
  metadata: Record<string, unknown>;
  embedding: number[]; // Replace with the actual data type you use
}

// Use mapped types for extra columns
type ExtraColumns<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

// Combine core and extra columns
type TableShape<T extends Record<string, unknown> = Record<string, unknown>> =
  CoreColumns & ExtraColumns<T>;

type PGOpts<T extends Record<string, unknown> = Record<string, unknown>> = {
  postgresConnectionOptions:
    | IBaseProtocol<TableShape<T>>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | Record<string, any>
    | string;

  embeddings: Embeddings;
  embeddingDims: number;
};
/**
 * pgp is a factory. It's pure (I think).
 */
const pgp = /* #__PURE__ */ pgPromise();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isIDatabase(obj: any): obj is IDatabase<any> {
  // Here, define what properties you expect IDatabase to have.
  // For example, assume that IDatabase should have a 'one' method:
  return obj && typeof obj.one === "function";
}

export class SemarPostgres<
  T extends Record<string, unknown> = Record<string, unknown>,
> {
  tweetVectorstore: PGVectorStore;
  summaryVectorstore: PGVectorStore;
  tweetstore: PGVectorStore;
  embeddings: Embeddings;
  pgInstance: IDatabase<TableShape<T>>;
  constructor(pgOpts: PGOpts) {
    this.embeddings = pgOpts.embeddings;
    if (
      typeof pgOpts.postgresConnectionOptions === "string" ||
      (typeof pgOpts.postgresConnectionOptions === "object" &&
        ("host" in pgOpts.postgresConnectionOptions ||
          "database" in pgOpts.postgresConnectionOptions))
    ) {
      this.pgInstance = pgp(pgOpts.postgresConnectionOptions) as IDatabase<
        TableShape<T>
      >;
    } else if (isIDatabase(pgOpts.postgresConnectionOptions)) {
      this.pgInstance = pgOpts.postgresConnectionOptions as IDatabase<
        TableShape<T>
      >;
    } else {
      throw new Error("Invalid pg-promise argument");
    }

    const pgNoneExt = new PGNoneExt({ pgDb: this.pgInstance, metric: "" });

    const summaryPgvsArgs = {
      postgresConnectionOptions: this.pgInstance,
      useHnswIndex: true,
      tableName: "summaries",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "text",
        metadataColumnName: "metadata",
      },
      extraColumns: [
        { name: "date", type: "TIMESTAMP", returned: true },
      ]
    };

    const tweetPgvsArgsSansExt = {
      postgresConnectionOptions: this.pgInstance,
      useHnswIndex: true,
      tableName: "tweets",
      columns: {
        idColumnName: "id",
        vectorColumnName: "embedding",
        contentColumnName: "text",
        metadataColumnName: "metadata",
      },
      extraColumns: [
        { name: "date", type: "TIMESTAMP", returned: true },
        { name: "url", type: "TEXT", returned: true },
        { name: "tags", type: "TEXT", returned: true }
      ],
    };

    this.tweetstore = new PGVectorStore(pgOpts.embeddings, {
      ...tweetPgvsArgsSansExt,
      pgExtensionOpts: pgNoneExt,
    });

    this.tweetVectorstore = new PGVectorStore(pgOpts.embeddings, {
      ...tweetPgvsArgsSansExt,
      pgExtensionOpts: {
        type: "pgvector",
        dims: pgOpts.embeddingDims,
        metric: "cosine",
      },
    });

    this.summaryVectorstore = new PGVectorStore(pgOpts.embeddings, {
      ...summaryPgvsArgs,
      pgExtensionOpts: {
        type: "pgvector",
        dims: pgOpts.embeddingDims,
        metric: "cosine",
      },
    });
  }

  async ensureTablesInDatabase(): Promise<void> {
    await this.connect();
    try {
      await Promise.all([
        this.tweetVectorstore.ensureTableInDatabase(),
        this.summaryVectorstore.ensureTableInDatabase()
      ]).catch((error) => {
        console.error(error);  
      });
    } catch (error) {
      console.error(error);
    }
  }

  async connect(): Promise<void> {
    await this.pgInstance.connect();
  }

  async disconnect(): Promise<void> {
    await this.pgInstance.$pool.end();
  }

  async fetchTweet(id: string): Promise<Tweet> {
    // Assuming 'tweets' is the name of your table and it contains columns that map directly to the Tweet type.
    // Adjust the column names as per your table definition.
    try {
      const tweet = await this.pgInstance.oneOrNone<Tweet>(
        "SELECT * FROM tweets WHERE id = $1",
        [id],
      );

      if (!tweet) {
        throw new Error(`Tweet with id ${id} not found.`);
      }

      return tweet;
    } catch (error) {
      throw new Error(`Error fetching tweet: ${error}`);
    }
  }

  static fromSearchResultsToTweets(docs: Document[]) {
    return docs.map((doc) => {
      const tweet = {
        id: doc.metadata.id,
        date: doc.metadata.date,
        url: doc.metadata.url,
        text: doc.pageContent
      } as Tweet;

      if (doc.metadata.tags && (doc.metadata.tags as string).length > 0) {
        tweet.tags = JSON.parse(doc.metadata.tags);
      }

      return tweet;
    });
  }

  async fetchTweets(limit: number, filter?: PGFilterWithJoin): Promise<Tweet[]> {
    const docs = await this.tweetstore.similaritySearchVectorWithScore(
      [],
      limit,
      filter,
    );
    return SemarPostgres.fromSearchResultsToTweets(docs.map((res) => res[0]));
  }

  async insertTweet(tweet: Tweet): Promise<void> {
    if (_.isNil(tweet.embedding)) {
      throw new Error("Needs vector embedding");
    }

    try {
      const date = new Date(tweet.date)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "");
      const tweetDoc = new Document({
        pageContent: tweet.text,
      });
      const tags: { tags?: string[] } = {};
      if (!_.isNil(tweet.tags)) {
        tags.tags = tweet.tags;
      }

      const addDocOpt = {
        extraColumns: [{ url: tweet.url, date, ...tags }],
        ids: [tweet.id],
      };

      await this.tweetVectorstore.addVectors(
        [tweet.embedding],
        [tweetDoc],
        addDocOpt,
      );
    } catch (error) {
      throw new Error(error as string);
    }
  }

  async insertTweets(tweets: Tweet[]): Promise<void> {
    if (tweets.some((tweet) => _.isNil(tweet.embedding))) {
      throw new Error("Needs vector embedding");
    }

    try {
      const opts = tweets.reduce(
        (acc, tweet) => {
          const date = new Date(tweet.date)
            .toISOString()
            .replace("T", " ")
            .replace(/\.\d+Z$/, "");
          acc.embeddings.push(tweet.embedding!);
          acc.docs.push(
            new Document({
              pageContent: tweet.text,
            }),
          );
          const pushParams: { url: string, date: string, tags?: string } = {
            url: tweet.url, 
            date
          }
          if (!_.isNil(tweet.tags)) {
            pushParams.tags = JSON.stringify(tweet.tags);
          }
          acc.opts.extraColumns.push(pushParams);
          acc.opts.ids.push(tweet.id);
          return acc;
        },
        {
          embeddings: [] as number[][],
          docs: [] as Document[],
          opts: {
            extraColumns: [] as any[],
            ids: [] as string[],
          },
        },
      );

      await this.tweetVectorstore.addVectors(
        opts.embeddings,
        opts.docs,
        opts.opts,
      );
    } catch (error) {
      throw new Error(error as string);
    }
  }

  async insertSummaries(summaries: Summary[]) {
    const embeddings = await Promise.all(
      summaries.map((summary) => {
        return this.embeddings.embedQuery(summary.text);
      }),
    );

    try {
      const opts = summaries.reduce(
        (acc, summary, idx) => {
          const date = new Date()
            .toISOString()
            .replace("T", " ")
            .replace(/\.\d+Z$/, "");
          acc.embeddings.push(embeddings[idx]);
          acc.docs.push(
            new Document({
              pageContent: summary.text,
            }),
          );
          const pushParams: { date: string } = {
            date
          };
          acc.opts.extraColumns.push(pushParams);
          acc.opts.ids.push(summary.id);
          return acc;
        },
        {
          embeddings: [] as number[][],
          docs: [] as Document[],
          opts: {
            extraColumns: [] as any[],
            ids: [] as string[],
          },
        },
      );

      await this.summaryVectorstore.addVectors(
        opts.embeddings,
        opts.docs,
        opts.opts,
      );
    } catch (error) {
      throw new Error(error as string);
    }
  }

  async fetchUser(id: string): Promise<User> {
    // Assuming 'tweets' is the name of your table and it contains columns that map directly to the Tweet type.
    // Adjust the column names as per your table definition.
    try {
      const tweet = await this.pgInstance.oneOrNone<User>(
        "SELECT * FROM users WHERE id = $1",
        [id],
      );

      if (!tweet) {
        throw new Error(`Tweet with id ${id} not found.`);
      }

      return tweet;
    } catch (error) {
      throw new Error(`Error fetching tweet: ${error}`);
    }
  }

  async fetchSummaries(limit?: number) {
    try {
      let summaries: Summary[];
      if(limit) {
        summaries = await this.pgInstance.manyOrNone<Summary>(
          "SELECT * FROM summaries LIMIT $1",
          [limit]
        );
      } else {
        summaries = await this.pgInstance.manyOrNone<Summary>("SELECT * FROM summaries");
      }

      return summaries;
    } catch (error) {
      throw new Error(`Error fetching summaries: ${error}`);
    }
  }

  insertUser(_user: User): Promise<User> {
    throw new Error("Method not implemented.");
  }
}
