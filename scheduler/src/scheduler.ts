import {
  ToadScheduler,
  SimpleIntervalJob,
  SimpleIntervalSchedule,
  AsyncTask,
} from "toad-scheduler";
import { v4 } from "uuid";
import callerInstance, { Caller } from "./caller.js";

export type SchedulerConfig = {
  rule: SimpleIntervalSchedule;
};

export function createRecurrenceRule(hours: number): SimpleIntervalSchedule {
  const schedule: SimpleIntervalSchedule = {
    runImmediately: true,
  };
  const wholeHours = Math.floor(hours);
  const minutes = Math.floor((hours - Math.floor(hours)) * 60);
  const seconds = Math.floor((minutes - Math.floor(minutes)) * 60);

  if (wholeHours > 0) {
    schedule.hours = wholeHours;
  }
  if (minutes > 0) {
    schedule.minutes = minutes;
  }
  if (seconds > 0) {
    schedule.seconds = seconds;
  }

  return schedule;
}

export class Scheduler {
  paused: boolean;
  job: SimpleIntervalJob;
  rule: SimpleIntervalSchedule;
  scheduler: ToadScheduler;
  ids: string[] = [];
  caller: Caller = callerInstance;
  constructor(config: SchedulerConfig) {
    this.rule = config.rule;
    this.paused = false;
    this.scheduler = new ToadScheduler();
  }

  async startJob() {
    const id = v4();
    this.ids.push(id);
    const task = new AsyncTask(
      id,
      async () => {
        if (!this.paused) {
          return this.caller.callScrapeTweets();
        }
      },
      (err: Error) => {
        console.error(err);
      },
    );
    this.job = new SimpleIntervalJob(this.rule, task);
    this.scheduler.addSimpleIntervalJob(this.job);
  }

  endScheduler() {
    this.scheduler.stop();
  }

  pause() {
    this.job.stop();
    this.paused = true;
  }

  unpause() {
    this.job.start();
    this.paused = false;
  }
}
