import dotenv from "dotenv";
dotenv.config();

const services = {
  "processor-start-pipeline": process.env.PROCESSOR_START_PIPELINE_ENDPOINT,
};

export function getServicesUrl(service: keyof typeof services) {
  if (services[service] === undefined) {
    throw new Error(`Service ${service} not found`);
  }

  return new URL(services[service]!).toString();
}
