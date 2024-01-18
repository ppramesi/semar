import { RawSummary, Summary } from "~/types/summary";
import pgInstance from "../../lib/db";
import { defineEventHandler } from "h3";
import { getSummariesPerPage } from "~/lib/env";

const summariesPerPage = getSummariesPerPage();

export default defineEventHandler(async (event) => {
  try {
    const summaries = await pgInstance.manyOrNone<RawSummary>("SELECT * FROM summaries ORDER BY date DESC LIMIT $1", [summariesPerPage]);
    return summaries.map(summary => {
      return {
        ...summary,
        ref_tweets: JSON.parse(summary.ref_tweets)
      } as Summary;
    });
  } catch (error) {
    event.node.res.statusCode = 500;
    return { error: (error as Error).message };
  }
});