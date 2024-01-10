import { createRecurrenceRule } from "./scheduler.js";
import { Scheduler } from "./scheduler.js";
import { Server } from "./server.js";

const main = async () => {
  const period = 1;
  const scheduler = new Scheduler({
    rule: createRecurrenceRule(period),
  });
  const server = new Server({
    scheduler,
  });
  await server.listen(process.env.SCHEDULER_PORT ?? 80085);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
