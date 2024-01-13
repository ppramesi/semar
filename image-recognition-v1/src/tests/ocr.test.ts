import { test } from "@jest/globals";
import ocr from "../processors/ocr";

test("Test ocr-ing", async () => {
  const processed = await ocr.processImageUrl("https://pbs.twimg.com/media/GDn5yHEWQAAXWKu.jpg");
  console.log({ processed });
}, 60 * 1000);