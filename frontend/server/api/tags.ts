import { Tag } from "~/types/tag";
import pgInstance from "../../lib/db";
import { defineEventHandler } from "h3";

export default defineEventHandler(async (event) => {
  try {
    return pgInstance.manyOrNone<Tag>("SELECT * FROM relevant_tags");
  } catch (error) {
    event.node.res.statusCode = 500;
    return { error: (error as Error).message };
  }
});