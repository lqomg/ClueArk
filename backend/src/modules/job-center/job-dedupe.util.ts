import type { ConfigService } from '@nestjs/config';
import type {
  ComputeSnapshotPayload,
  CrawlWebPayload,
  EnrichItemPayload,
  EnqueueInput,
  ProcessNewItemPayload,
  ReindexMonitorPayload,
  CreateMonitorPayload,
  RunBriefPayload,
  SourcePollPayload,
} from './job.types';

export function buildDedupeKey(input: EnqueueInput, config: ConfigService): string | null {
  if (input.dedupeKey?.trim()) return input.dedupeKey.trim();

  const p = input.payload as Record<string, unknown>;

  switch (input.type) {
    case 'source_poll': {
      const { sourceId } = p as SourcePollPayload;
      return sourceId ? `poll:${sourceId}` : null;
    }
    case 'crawl_web': {
      const { sourceId } = p as CrawlWebPayload;
      return sourceId ? `crawl:${sourceId}` : null;
    }
    case 'process_new_item': {
      const { feedItemId } = p as ProcessNewItemPayload;
      return feedItemId ? `item:${feedItemId}` : null;
    }
    case 'reindex_monitor': {
      const { monitorId } = p as ReindexMonitorPayload;
      return monitorId ? `reindex:${monitorId}` : null;
    }
    case 'create_monitor': {
      const { monitorId } = p as CreateMonitorPayload;
      return monitorId ? `create_monitor:${monitorId}` : null;
    }
    case 'enrich_item': {
      const { feedItemId } = p as EnrichItemPayload;
      return feedItemId ? `enrich:${feedItemId}` : null;
    }
    case 'compute_snapshot': {
      const { monitorId, recentHours } = p as ComputeSnapshotPayload;
      const rh =
        recentHours ?? (Number(config.get('MONITOR_SNAPSHOT_DEFAULT_RECENT_HOURS')) || 720);
      return monitorId ? `snapshot:${monitorId}:${rh}` : null;
    }
    case 'run_brief': {
      const { monitorId, profileId, locale } = p as RunBriefPayload;
      const hourBucket = Math.floor(Date.now() / 3_600_000);
      const loc = locale?.trim() || 'zh-CN';
      return monitorId && profileId ? `brief:${monitorId}:${profileId}:${loc}:h${hourBucket}` : null;
    }
    default:
      return null;
  }
}

export function extractIndexFields(
  type: EnqueueInput['type'],
  payload: Record<string, unknown>,
): {
  sourceId?: string;
  monitorId?: string;
  feedItemId?: string;
} {
  const out: { sourceId?: string; monitorId?: string; feedItemId?: string } = {};
  if (typeof payload.sourceId === 'string') out.sourceId = payload.sourceId;
  if (typeof payload.monitorId === 'string') out.monitorId = payload.monitorId;
  if (typeof payload.feedItemId === 'string') out.feedItemId = payload.feedItemId;
  if (type === 'source_poll' || type === 'crawl_web') {
    /* sourceId only */
  }
  return out;
}
