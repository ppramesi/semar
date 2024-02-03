import { v4 } from "uuid";
import { Tweet } from "../../../types/tweet";
import { HuggingFaceFetchSummarizer } from "../hf";

import dotenv from "dotenv";

dotenv.config();

const tweets: Tweet[] = [
  {
    id: v4(),
    text: "https://apnews.com/article/tesla-california-hazardous-waste-settlement-ea1eb742720b8a1fefe38a45407a8a9b",
    date: new Date(),
    url: "https://twitter.com/ap/asdfasdf1324"
  },
  {
    id: v4(),
    text: "https://edition.cnn.com/2024/02/02/politics/us-strikes-iraq-syria/index.html",
    date: new Date(),
    url: "https://twitter.com/cnn/asdfasdf1324"
  },
  {
    id: v4(),
    text: "https://www.aljazeera.com/news/2024/2/2/icj-rules-that-it-will-hear-part-of-ukraine-russia-genocide-case",
    date: new Date(),
    url: "https://twitter.com/ajenglish/asdfasdf1324"
  },
  {
    id: v4(),
    text: "https://www.aljazeera.com/news/2024/2/3/overshadow-gaza-crimes-world-reacts-to-us-attacks-on-iraq-and-syria",
    date: new Date(),
    url: "https://twitter.com/ajenglish/asdfasdf1324"
  },
  {
    id: v4(),
    text: "https://edition.cnn.com/2024/02/02/politics/trump-trial-date-postponed/index.html",
    date: new Date(),
    url: "https://twitter.com/cnn/asdfasdf1324"
  }
];

let fetchSummarizer: HuggingFaceFetchSummarizer;

beforeEach(() => {
  fetchSummarizer = new HuggingFaceFetchSummarizer();
});

test("Fetch Summarizer Test", async () => {
  const summaries = await fetchSummarizer.summarizeTweetArticles(tweets);
  console.log({ summaries });
  expect(summaries.length).toBe(tweets.length);
}, 1000 * 60 * 5);