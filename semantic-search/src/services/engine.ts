import { SemarPostgres } from "../adapters/db/pg.js";
import { Summary } from "../types/tweet.js";
import caller from "./callers/caller.js";
import _ from "lodash";

export type SearchEngineOptions = {
  db: SemarPostgres;
};

export class SearchEngine {
  db: SemarPostgres;

  constructor(options: SearchEngineOptions) {
    this.db = options.db;
  }

  async search(
    query: string,
    offset: number = 0,
    limit: number = 10,
  ): Promise<Summary[]> {
    const fromVectorStore = await this.db.summaryVectorstore.similaritySearch(
      query,
      2 * (10 + offset + limit),
    );
    console.log({ fromVectorStore });
    const summaries = fromVectorStore.map((doc) => {
      return {
        id: doc.metadata.id,
        ref_tweets: JSON.parse(
          !_.isEmpty(doc.metadata.ref_tweets) ? doc.metadata.ref_tweets : "[]",
        ),
        text: doc.pageContent,
      };
    }) as Summary[];
    const reranked = await caller.crossEncoderRerank(
      query,
      summaries.map((summary) => summary.text),
    );
    const rerankedSummaries = reranked.map((idx) => summaries[idx]);

    return rerankedSummaries.slice(offset, offset + limit);
  }
}
