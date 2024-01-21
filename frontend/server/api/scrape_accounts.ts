import { ScrapeAccount } from "~/types/scrape_account";
import pgInstance from "../../lib/db";
import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  try {
    return pgInstance.manyOrNone<ScrapeAccount>("SELECT * FROM scrape_accounts");
  } catch (error) {
    event.node.res.statusCode = 500;
    return { error: (error as Error).message };
  }
});