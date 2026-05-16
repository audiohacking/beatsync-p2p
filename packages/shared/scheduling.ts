export const MIN_SCHEDULE_TIME_MS = 400;
export const DEFAULT_CLIENT_RTT_MS = 0;
const CAP_SCHEDULE_TIME_MS = 3_000;

export function calculateScheduleTimeMs(maxRTT: number): number {
  const dynamicDelay = Math.max(MIN_SCHEDULE_TIME_MS, maxRTT * 1.5 + 200);
  return Math.min(dynamicDelay, CAP_SCHEDULE_TIME_MS);
}
