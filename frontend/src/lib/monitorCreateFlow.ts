/** 与后端 MonitorCreateStep 对齐（不含 done） */
export const MONITOR_CREATE_STEPS = [
  'understand',
  'describe',
  'sources',
  'embedding',
  'saving',
  'snapshot',
] as const;

export type MonitorCreateStepId = (typeof MONITOR_CREATE_STEPS)[number] | 'done';

export type MonitorCreateStatusValue = 'processing' | 'ready' | 'failed';

export function monitorCreateStepIndex(step: string): number {
  const i = MONITOR_CREATE_STEPS.indexOf(step as (typeof MONITOR_CREATE_STEPS)[number]);
  return i >= 0 ? i : MONITOR_CREATE_STEPS.length;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollUntil<T>(
  fn: () => Promise<T>,
  shouldStop: (value: T) => boolean,
  opts: { intervalMs?: number; deadlineMs?: number; isAlive?: () => boolean },
): Promise<T | null> {
  const interval = opts.intervalMs ?? 1000;
  const deadline = Date.now() + (opts.deadlineMs ?? 120_000);
  let last: T | null = null;
  while (Date.now() < deadline) {
    if (opts.isAlive && !opts.isAlive()) return last;
    last = await fn();
    if (shouldStop(last)) return last;
    await sleep(interval);
  }
  return last;
}

export function isSnapshotPending(status: string | undefined | null): boolean {
  return status === 'pending' || status === 'computing';
}
