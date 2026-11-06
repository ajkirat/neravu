import { addDays } from "./dates";

/** Ready-made recurring jobs a PG has: title key and how often (days). */
export const JOB_PRESETS = [
  { key: "job_TANK", every: 90 },
  { key: "job_PEST", every: 30 },
  { key: "job_GAS", every: 20 },
  { key: "job_RO", every: 90 },
  { key: "job_SUMP", every: 180 },
  { key: "job_FIRE", every: 365 },
  { key: "job_LIFT", every: 30 },
  { key: "job_GENSET", every: 90 },
  { key: "job_DEEPCLEAN", every: 30 },
  { key: "job_BEDSHEET", every: 7 },
] as const;

export const EVERY_CHOICES = [7, 15, 20, 30, 60, 90, 180, 365];

/** When a job is done today, it is next due `every` days later. */
export const nextAfterDone = (doneOn: Date, every: number) => addDays(doneOn, Math.max(1, every));
