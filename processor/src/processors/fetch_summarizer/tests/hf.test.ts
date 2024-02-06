import { v4 } from "uuid";
import dotenv from "dotenv";
import { Tweet } from "../../../types/tweet";
import { TransformersFetchSummarizer } from "../hf";
// import axios from "axios";
import _ from "lodash";

dotenv.config();

const tweets: Tweet[] = [
  {
    id: v4(),
    text: "https://apnews.com/article/tesla-california-hazardous-waste-settlement-ea1eb742720b8a1fefe38a45407a8a9b",
    date: new Date(),
    url: "https://twitter.com/ap/asdfasdf1324",
  },
  {
    id: v4(),
    text: "https://edition.cnn.com/2024/02/02/politics/us-strikes-iraq-syria/index.html",
    date: new Date(),
    url: "https://twitter.com/cnn/asdfasdf1324",
  },
  {
    id: v4(),
    text: "https://www.aljazeera.com/news/2024/2/2/icj-rules-that-it-will-hear-part-of-ukraine-russia-genocide-case",
    date: new Date(),
    url: "https://twitter.com/ajenglish/asdfasdf1324",
  },
  {
    id: v4(),
    text: "https://www.aljazeera.com/news/2024/2/3/overshadow-gaza-crimes-world-reacts-to-us-attacks-on-iraq-and-syria",
    date: new Date(),
    url: "https://twitter.com/ajenglish/asdfasdf1324",
  },
  {
    id: v4(),
    text: "https://www.reuters.com/world/middle-east/irans-guards-pull-officers-syria-after-israeli-strikes-2024-02-01/",
    date: new Date(),
    url: "https://twitter.com/reuters/asdfasdf1324",
  },
  {
    id: v4(),
    text: "https://edition.cnn.com/2024/02/02/politics/trump-trial-date-postponed/index.html",
    date: new Date(),
    url: "https://twitter.com/cnn/asdfasdf1324",
  },
];

let fetchSummarizer: TransformersFetchSummarizer;

beforeEach(() => {
  fetchSummarizer = new TransformersFetchSummarizer();
});

test(
  "Fetch Summarizer Test",
  async () => {
    const summaries = await fetchSummarizer.summarizeTweetArticles(tweets);
    console.log({ summaries });
    expect(summaries.length).toBe(tweets.length);
  },
  1000 * 60 * 5,
);

test("Fetch Summarizer Online Test", async () => {
  const articles = await fetchSummarizer.fetchArticles(tweets);
  const summ = await Promise.allSettled(articles.map((article) => {
    if(!_.isEmpty(article)){
      return axios.post(process.env.SUMMARIZER_ENDPOINT!, {
        text: article,
      },
      {
        headers: {
          "auth-token": process.env.AUTH_TOKEN!
        }
      })
    }
    return null;
  }))
  console.log(summ);
}, 1000 * 60 * 5)