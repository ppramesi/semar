import { Server } from "./server.js";

const testRun = async () => {
  const server = new Server();
  await server.listen(process.env.IR_PORT ?? 2323);
}

testRun()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });