import schedule, { RecurrenceRule, Job } from "node-schedule";
import { RunManager } from "./manager";

export type SchedulerConfig = {
  rule: string | RecurrenceRule;
  runManager: RunManager;
};

export function createRecurrenceRule(hours: number): RecurrenceRule {
  if (hours <= 0) {
      throw new Error('Hours must be greater than 0.');
  }

  const rule = new RecurrenceRule();

  if (hours < 24) {
      // For intervals less than 24 hours
      const totalMinutes = hours * 60;
      const wholeHours = Math.floor(hours);
      const minutes = Math.round((hours - wholeHours) * 60);

      rule.minute = new schedule.Range(0, totalMinutes, minutes);
      rule.hour = new schedule.Range(wholeHours, 23, wholeHours);
  } else {
      // For intervals of 24 hours or more
      const days = Math.round(hours / 24);
      rule.dayOfWeek = new schedule.Range(0, 6, days);
      rule.hour = 0;  // or any other specific hour of the day
      rule.minute = 0;
  }

  return rule;
}

export class Scheduler {
  paused: boolean;
  job: Job;
  rule: string | RecurrenceRule;
  manager: RunManager;
  constructor(config: SchedulerConfig){
    this.rule = config.rule;
    this.manager = config.runManager;
    this.paused = false;
  }

  async startJob() {
    this.job = schedule.scheduleJob(this.rule, () => {
      if (!this.paused) {
        this.manager.run()
      }
    });
    await this.manager.run();
  }

  endJob() {
    this.job.cancel();
  }

  pause() {
    this.paused = true;
  }

  unpause() {
    this.paused = false;
  }
}