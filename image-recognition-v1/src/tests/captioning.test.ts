import { test } from "@jest/globals";
import captioning from "../processors/captioning.js";

test(
  "Test captioning",
  async () => {
    const processed = await captioning.processImageUrl(
      "https://pbs.twimg.com/media/GDn5yHEWQAAXWKu.jpg",
    );
    console.log({ processed });
  },
  30 * 60 * 1000,
);
