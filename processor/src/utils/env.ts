import dotenv from "dotenv";
dotenv.config();

const services = {
  "article-fetcher": process.env.ARTICLE_FETCHER_ENDPOINT,
  "harvester-search": process.env.HARVESTER_SEARCH_ENDPOINT,
  "harvester-scrape": process.env.HARVESTER_SCRAPE_ENDPOINT,
  "zero-shot-classifier": process.env.ZERO_SHOT_CLASSIFIER_ENDPOINT,
  summarizer: process.env.SUMMARIZER_ENDPOINT,
  reranker: process.env.RERANKER_ENDPOINT,
};

export function getServicesUrl(service: keyof typeof services) {
  if (services[service] === undefined) {
    throw new Error(`Service ${service} not found`);
  }

  return new URL(services[service]!).toString();
}
