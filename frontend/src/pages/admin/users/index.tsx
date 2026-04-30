import { useCallback, useEffect, useState } from 'react';
import { listAdminUsers, setAdminUserActive } from '@/api/admin/users';
import { useAuthStore } from '@/stores/authStore';
import type { AdminUserListResponse, AdminUserRow } from '@/types/admin';

export function AdminUsersPage() {
  const selfId = useAuthStore((s) => s.user?.id);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [data, setData] = useState<AdminUserListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search.trim()) q.set('search', search.trim());
      const res = await listAdminUsers(q.toString());
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void load();
  }, [load]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function toggleActive(u: AdminUserRow, next: boolean) {
    setBusyId(u._id);
    setError(null);
    try {
      await setAdminUserActive(u._id, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败');
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">用户列表</h2>
          <p className="mt-1 text-sm text-slate-500">启用 / 停用账号（不能停用自己）。</p>
        </div>
        <form onSubmit={applySearch} className="flex w-full max-w-md gap-2 sm:w-auto">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="邮箱或用户名"
            className="min-w-0 flex-1 rounded-xl border border-ark-border bg-ark-bg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg border border-ark-border px-4 py-2 text-sm font-semibold text-ark-text hover:border-ark-accent/40"
          >
            搜索
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-ark-border shadow-lg shadow-black/20">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="border-b border-ark-border bg-ark-surface text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">邮箱</th>
              <th className="px-4 py-3 font-semibold">用户名</th>
              <th className="px-4 py-3 font-semibold">角色</th>
              <th className="px-4 py-3 font-semibold">状态</th>
              <th className="px-4 py-3 font-semibold">注册时间</th>
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  加载中…
                </td>
              </tr>
            ) : !data?.items.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  暂无用户
                </td>
              </tr>
            ) : (
              data.items.map((u) => {
                const isSelf = u._id === selfId;
                return (
                  <tr key={u._id} className="border-t border-ark-border bg-ark-bg/10">
                    <td className="px-4 py-3 font-mono text-xs text-ark-text">{u.email}</td>
                    <td className="px-4 py-3 text-ark-text">{u.username}</td>
                    <td className="px-4 py-3 text-slate-400">{u.role === 'admin' ? '管理员' : '用户'}</td>
                    <td className="px-4 py-3">
                      <span className={u.isActive ? 'text-emerald-400' : 'text-slate-500'}>
                        {u.isActive ? '正常' : '已停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {u.createdAt ? new Date(u.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {u.isActive ? (
                        <button
                          type="button"
                          disabled={Boolean(busyId) || isSelf}
                          title={isSelf ? '不能停用自己' : undefined}
                          onClick={() => void toggleActive(u, false)}
                          className="text-sm text-amber-300/90 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {busyId === u._id ? '…' : '停用'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={Boolean(busyId)}
                          onClick={() => void toggleActive(u, true)}
                          className="text-sm text-emerald-400 hover:underline disabled:opacity-40"
                        >
                          {busyId === u._id ? '…' : '启用'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > pageSize ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            共 {data.total} 条 · 第 {data.page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-ark-border px-4 py-1.5 hover:bg-white/5 disabled:opacity-40"
            >
              上一页
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-ark-border px-4 py-1.5 hover:bg-white/5 disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
