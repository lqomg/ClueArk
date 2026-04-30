import { useEffect, useState } from 'react';
import { changePassword as changePasswordApi, getMe } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
import type { MeResponse } from './types';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMe();
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      await changePasswordApi({ oldPassword, newPassword });
      setMsg('密码已更新');
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : '修改失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="scrollbar-hide mx-auto max-w-xl min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-y-contain pb-8">
      <div>
        <h1 className="text-xl font-semibold text-ark-text">个人中心</h1>
        <p className="mt-1 text-sm text-ark-muted">账号信息与安全设置</p>
      </div>
      <section className="rounded-lg border border-ark-border bg-ark-surface p-5">
        <h2 className="text-sm font-semibold text-ark-text">账号信息</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ark-muted">邮箱</dt>
            <dd className="text-ark-text">{me?.email ?? user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ark-muted">用户名</dt>
            <dd className="text-ark-text">{me?.username ?? user?.username}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-lg border border-ark-border bg-ark-surface p-5">
        <h2 className="text-sm font-semibold text-ark-text">修改密码</h2>
        <form className="mt-4 space-y-3" onSubmit={changePassword}>
          {err ? <div className="text-sm text-red-300">{err}</div> : null}
          {msg ? <div className="text-sm text-emerald-300">{msg}</div> : null}
          <input
            type="password"
            placeholder="原密码"
            className="w-full rounded-md border border-ark-border bg-ark-bg px-3 py-2 text-sm"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="新密码（至少 6 位）"
            className="w-full rounded-md border border-ark-border bg-ark-bg px-3 py-2 text-sm"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-ark-accent px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-ark-accent/15 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '保存中…' : '保存新密码'}
          </button>
        </form>
      </section>
    </div>
  );
}
