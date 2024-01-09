import pgPromise from "pg-promise";

const runtimeConfig = useRuntimeConfig();

const pgp = pgPromise();

const pgInstance = pgp({
  host: runtimeConfig.postgresHost as string,
  database: runtimeConfig.postgresDb as string,
  user: runtimeConfig.postgresUser as string,
  password: runtimeConfig.postgresPassword as string,
  port: Number(runtimeConfig.postgresPort as string),
  max: 20,
});

pgInstance.connect();

export default pgInstance;