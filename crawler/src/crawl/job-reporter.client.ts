import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type JobStatusUpdate = {
  status: 'active' | 'completed' | 'failed';
  resultSummary?: Record<string, unknown>;
  errorMessage?: string;
  durationMs?: number;
  attempts?: number;
};

const FETCH_TIMEOUT_MS = 25_000;

@Injectable()
export class JobReporterClient {
  private readonly logger = new Logger(JobReporterClient.name);

  constructor(private readonly config: ConfigService) {}

  private requireBackendBase(): string {
    const raw = this.config.get<string>('CLUEARK_BACKEND_URL')?.trim();
    if (!raw) throw new Error('CLUEARK_BACKEND_URL 未配置');
    return raw.replace(/\/+$/, '');
  }

  private authHeaders(): Record<string, string> {
    const secret = this.config.get<string>('CRAWLER_INGEST_SECRET')?.trim();
    if (!secret) throw new Error('CRAWLER_INGEST_SECRET 未配置');
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${secret}`,
    };
  }

  async patchStatus(jobId: string, body: JobStatusUpdate): Promise<void> {
    const base = this.requireBackendBase();
    const url = `${base}/api/internal/jobs/${jobId}/status`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`PATCH job status HTTP ${res.status} ${t.slice(0, 300)}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`job status 回写失败 jobId=${jobId} status=${body.status} err=${msg}`);
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
}
