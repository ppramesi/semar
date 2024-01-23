import dotenv from 'dotenv';
import { parseEnv, z } from "znv";
dotenv.config();

const services = {
  "harvester": process.env.HARVESTER_ENDPOINT,
  "processor": process.env.PROCESSOR_ENDPOINT,
  "scheduler": process.env.SCHEDULER_ENDPOINT,
  "db": process.env.DB_ENDPOINT,
  "auth": process.env.AUTH_ENDPOINT,
  "zero-shot-classifier": process.env.ZERO_SHOT_CLASSIFIER_ENDPOINT,
  "reranker": process.env.RERANKER_ENDPOINT,
  "ocr": process.env.OCR_ENDPOINT,
  "captioner": process.env.CAPTIONER_ENDPOINT
};

export function getServicesUrl(service: keyof typeof services){
  if (services[service] === undefined) {
    throw new Error(`Service ${service} not found`);
  }
  
  return new URL(services[service]).toString();
}

export const { ACCESS_TOKEN, HEADLESS_MODE, ENABLE_EXPONENTIAL_BACKOFF } =
  parseEnv(process.env, {
    ACCESS_TOKEN: z.string().min(1).optional(),
    HEADLESS_MODE: z.boolean().default(true),
    ENABLE_EXPONENTIAL_BACKOFF: z.boolean().default(false),
  });
