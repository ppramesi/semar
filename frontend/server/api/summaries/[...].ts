import { RawSummary, Summary } from "~/types/summary";
import pgInstance from "../../../lib/db";
import { defineEventHandler } from "h3";
import { getSummariesPerPage } from "~/lib/env";

const summariesPerPage = getSummariesPerPage();

async function fetchSummaries(limit: number, offset: number) {
  const summaries = await pgInstance.manyOrNone<RawSummary>("SELECT * FROM summaries ORDER BY date DESC LIMIT $1 OFFSET $2", [limit, offset]);
  return summaries.map(summary => {
    return {
      ...summary,
      ref_tweets: JSON.parse(summary.ref_tweets)
    } as Summary;
  });
}

export default defineEventHandler(async (event) => {
  try {
    const path = event.context.params?._;
    // check if path is valid
    if (!path || path.length === 0 || !path.match(/^\d+(\/\d+)?$/)) {
      return [];
    }

    const pagination = path.split("/").map(Number);
    
    // Validate pagination parameters are positive integers
    if (pagination.some(p => !Number.isInteger(p) || p < 0)) {
      return [];
    }

    // Handle two pagination parameters
    if (pagination.length === 2) {
      const [startPage, endPage] = pagination;
      
      // Check if start page is greater than end page
      if (startPage > endPage) {
        return [];
      }
      
      // Additional check to ensure the range is not too large (optional)
      if ((endPage - startPage) > 10) { // Assuming a maximum range of 10 pages
        return [];
      }

      const limit = (endPage - startPage + 1) * summariesPerPage;
      const offset = startPage * summariesPerPage;
      const summaries = await fetchSummaries(limit, offset);
      return summaries;
    }

    // Handle single pagination parameter
    if (pagination.length === 1) {
      const offset = pagination[0] * summariesPerPage;
      const summaries = await fetchSummaries(summariesPerPage, offset);
      return summaries;
    }

    return [];
  } catch (error) {
    event.node.res.statusCode = 500;
    return { error: (error as Error).message };
  }
});
