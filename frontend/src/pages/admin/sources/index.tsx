import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Plus, Trash2, Upload } from 'lucide-react';
import {
  deleteAdminSource,
  exportAdminSourcesJson,
  importAdminSourcesJson,
  listAdminSources,
  patchAdminSource,
} from '@/api/admin/sources';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui';
import type { Source } from '@/types/models';
import { KIND_LABEL } from './utils';
import { AdminSourceDrawerForm } from '@/pages/admin/components/admin-source-drawer-form';

type DrawerState = null | { mode: 'create' } | { mode: 'edit'; id: string };

export function AdminSourcesPage() {
  const [rows, setRows] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [ioBusy, setIoBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listAdminSources();
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  async function toggleEnabled(row: Source) {
    setSavingId(row.id);
    setError(null);
    try {
      await patchAdminSource(row.id, { enabled: !row.enabled });
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '更新失败');
    } finally {
      setSavingId(null);
    }
  }

  async function handleExportJson() {
    setIoBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payload = await exportAdminSourcesJson();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clueark-sources-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg(`已导出 ${payload.sources.length} 条信源到 JSON 文件。`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '导出失败');
    } finally {
      setIoBusy(false);
    }
  }

  async function handleImportFile(file: File) {
    setIoBusy(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      const result = await importAdminSourcesJson(parsed);
      const failHint =
        result.failed.length > 0
          ? ` 失败明细（前 5 条）：${result.failed
              .slice(0, 5)
              .map((f) => `#${f.index} ${f.reason}`)
              .join('；')}`
          : '';
      setSuccessMsg(
        `导入完成：新建 ${result.created}，更新 ${result.updated}，因指纹重复跳过 ${result.skippedDuplicate}，失败 ${result.failed.length} 条。${failHint}`.trim(),
      );
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '导入失败');
    } finally {
      setIoBusy(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  }

  async function confirmDelete() {
    if (!confirmId) return;
    setSavingId(confirmId);
    setError(null);
    try {
      await deleteAdminSource(confirmId);
      setConfirmId(null);
      await loadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">信源管理</h2>
          <p className="mt-1 text-sm text-slate-500">
            维护全站信源池（仅管理员）；用户端只读浏览与直达。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="gap-2"
            disabled={ioBusy}
            onClick={() => void handleExportJson()}
          >
            <Download size={18} aria-hidden />
            导出 JSON
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="gap-2"
            disabled={ioBusy}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload size={18} aria-hidden />
            导入 JSON
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) void handleImportFile(f);
            }}
          />
          <Button type="button" variant="primary" size="lg" onClick={() => setDrawer({ mode: 'create' })}>
            <Plus size={18} aria-hidden />
            新建信源
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}
      {successMsg ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMsg}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-ark-border shadow-lg shadow-black/20">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-ark-border bg-ark-surface text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-3 font-semibold">ID</th>
              <th className="px-3 py-3 font-semibold">名称</th>
              <th className="px-3 py-3 font-semibold">类型</th>
              <th className="px-3 py-3 font-semibold">官方</th>
              <th className="px-3 py-3 font-semibold">启用</th>
              <th className="px-3 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : !rows.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-ark-border bg-ark-bg/10">
                  <td className="max-w-[100px] truncate px-3 py-2 font-mono text-[10px] text-slate-500" title={r.id}>
                    {r.id}
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2 font-medium text-ark-text" title={r.displayName}>
                    {r.displayName}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{KIND_LABEL[r.kind]}</td>
                  <td className="px-3 py-2">{r.isOfficial ? '是' : '否'}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={savingId === r.id}
                      onClick={() => void toggleEnabled(r)}
                      className={`text-xs font-semibold underline-offset-2 hover:underline disabled:opacity-40 ${
                        r.enabled ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                    >
                      {r.enabled ? '已启用' : '已禁用'}
                    </button>
                  </td>
                  <td className="space-x-2 whitespace-nowrap px-3 py-2">
                    <button
                      type="button"
                      className="text-ark-accent hover:underline"
                      onClick={() => setDrawer({ mode: 'edit', id: r.id })}
                    >
                      编辑
                    </button>
                    <Button
                      type="button"
                      variant="dangerGhost"
                      className="inline-flex items-center gap-1 !text-red-300 hover:!text-red-200"
                      disabled={Boolean(savingId)}
                      onClick={() => setConfirmId(r.id)}
                    >
                      <Trash2 size={14} aria-hidden />
                      删除
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(confirmId)}
        title="软删除该信源？"
        description="将标记删除并禁用；数据库仍保留记录。"
        confirmText="删除"
        danger
        onCancel={() => !savingId && setConfirmId(null)}
        onConfirm={() => void confirmDelete()}
      />

      {drawer ? (
        <AdminSourceDrawerForm
          key={drawer.mode === 'edit' ? drawer.id : 'create'}
          mode={drawer.mode}
          editSourceId={drawer.mode === 'edit' ? drawer.id : null}
          onClose={() => setDrawer(null)}
          onSaved={() => void loadList()}
        />
      ) : null}
    </div>
  );
}
