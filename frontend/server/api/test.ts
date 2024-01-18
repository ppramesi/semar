import { defineEventHandler } from "h3";

export default defineEventHandler(async (_event) => {
  return Math.random().toString(36).substring(2);
});