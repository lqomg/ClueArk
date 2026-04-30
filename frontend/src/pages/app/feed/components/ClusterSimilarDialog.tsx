import { X } from 'lucide-react';
import { IconButton } from '@/components/ui';
import type { ClusterRow } from '../types';

export interface ClusterSimilarDialogProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  rows: ClusterRow[] | null;
}

export function ClusterSimilarDialog({ open, onClose, loading, error, rows }: ClusterSimilarDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="cluster-dialog-title"
      onClick={onClose}
    >
      <div
        className="max-h-[min(80vh,560px)] w-full max-w-lg overflow-hidden rounded-2xl border border-ark-border bg-ark-sidebar shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ark-border px-4 py-3">
          <h2 id="cluster-dialog-title" className="text-sm font-bold text-white">
            相似报道
          </h2>
          <IconButton onClick={onClose} aria-label="关闭">
            <X size={18} />
          </IconButton>
        </div>
        <div className="max-h-[min(70vh,480px)] overflow-y-auto px-4 py-3">
          {loading ? (
            <p className="text-sm text-slate-500">加载中…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <ul className="space-y-3">
              {(rows ?? []).map((row) => (
                <li key={row.id} className="rounded-lg border border-ark-border bg-ark-bg/80 px-3 py-2.5">
                  <div className="text-[11px] text-slate-500">{row.sourceDisplayName || '未知信源'}</div>
                  <a
                    href={row.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-sm font-semibold text-ark-accent hover:underline"
                  >
                    {row.title}
                  </a>
                  {row.publishedAt ? (
                    <time className="mt-1 block font-mono text-[12px] text-slate-600" dateTime={row.publishedAt}>
                      {new Date(row.publishedAt).toLocaleString()}
                    </time>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
