import dotenv from "dotenv";
dotenv.config();

const services = {
  reranker: process.env.RERANKER_ENDPOINT,
};

export function getServicesUrl(service: keyof typeof services) {
  if (services[service] === undefined) {
    throw new Error(`Service ${service} not found`);
  }

  return new URL(services[service]!).toString();
}
