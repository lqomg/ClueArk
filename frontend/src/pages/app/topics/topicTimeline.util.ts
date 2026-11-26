import type { MonitorDevelopment } from '@/types/models';

export const DEVELOPMENT_ACTIVITY_HINT_MS = 60 * 60 * 1000;

function parseAt(iso: string | null | undefined): number {
  if (!iso) return NaN;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : NaN;
}

export function developmentPrimaryAtMs(item: MonitorDevelopment): number {
  return parseAt(item.occurredAt || item.timelineAt || '');
}

export function developmentActivityAtMs(item: MonitorDevelopment): number {
  const primary = developmentPrimaryAtMs(item);
  const activity = parseAt(item.lastMeaningfulAt);
  if (Number.isFinite(activity) && Number.isFinite(primary)) return Math.max(activity, primary);
  if (Number.isFinite(activity)) return activity;
  if (Number.isFinite(primary)) return primary;
  return 0;
}

export function developmentHasSubstantiveUpdate(
  item: Pick<MonitorDevelopment, 'occurredAt' | 'timelineAt' | 'lastMeaningfulAt'>,
  thresholdMs = DEVELOPMENT_ACTIVITY_HINT_MS,
): boolean {
  const primary = parseAt(item.occurredAt || item.timelineAt || '');
  const activity = parseAt(item.lastMeaningfulAt);
  if (!Number.isFinite(primary) || !Number.isFinite(activity)) return false;
  return activity - primary >= thresholdMs;
}

export function sortTopicDevelopments(developments: MonitorDevelopment[]): MonitorDevelopment[] {
  return [...developments].sort((a, b) => {
    const byActivity = developmentActivityAtMs(b) - developmentActivityAtMs(a);
    if (byActivity !== 0) return byActivity;
    const byPrimary = developmentPrimaryAtMs(b) - developmentPrimaryAtMs(a);
    if (byPrimary !== 0) return byPrimary;
    return String(b.id).localeCompare(String(a.id));
  });
}
