import { useEffect, useState } from 'react';
import { changePassword as changePasswordApi, getMe, patchProfile } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
import { COMMON_IANA_TIME_ZONES, normalizeUserTimeZone } from '@/lib/datetime';
import type { MeResponse } from './types';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [tzDraft, setTzDraft] = useState('');
  const [tzMsg, setTzMsg] = useState<string | null>(null);
  const [tzErr, setTzErr] = useState<string | null>(null);
  const [tzSaving, setTzSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMe();
        if (!cancelled) {
          setMe(data);
          setTzDraft(normalizeUserTimeZone(data.timeZone));
          useAuthStore.getState().patchUser({
            username: data.username,
            email: data.email,
            timeZone: data.timeZone,
          });
        }
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

  async function saveTimeZone(e: React.FormEvent) {
    e.preventDefault();
    setTzErr(null);
    setTzMsg(null);
    const trimmed = tzDraft.trim();
    const normalized = normalizeUserTimeZone(trimmed);
    if (normalized !== trimmed) {
      setTzErr('时区名称无效，请从下方列表选择，或按示例格式填写（如 Asia/Shanghai）');
      return;
    }
    setTzSaving(true);
    try {
      const updated = await patchProfile({ timeZone: trimmed });
      setMe(updated);
      patchUser({ timeZone: updated.timeZone });
      setTzDraft(normalizeUserTimeZone(updated.timeZone));
      setTzMsg('显示时区已保存');
    } catch (e) {
      setTzErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setTzSaving(false);
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
        <h2 className="text-sm font-semibold text-ark-text">显示时区</h2>
        <p className="mt-2 text-xs leading-relaxed text-ark-muted">
          情报列表、话题监控中的时间与近 7 日趋势，会按您在此选择的时区展示与统计。
        </p>
        <form className="mt-4 space-y-3" onSubmit={saveTimeZone}>
          {tzErr ? <div className="text-sm text-red-300">{tzErr}</div> : null}
          {tzMsg ? <div className="text-sm text-emerald-300">{tzMsg}</div> : null}
          <label className="block text-xs font-medium text-ark-muted" htmlFor="profile-timezone">
            时区
          </label>
          <input
            id="profile-timezone"
            className="w-full rounded-md border border-ark-border bg-ark-bg px-3 py-2 font-mono text-sm"
            value={tzDraft}
            onChange={(e) => setTzDraft(e.target.value)}
            placeholder="Asia/Shanghai"
            list="clueark-iana-tz"
            autoComplete="off"
          />
          <datalist id="clueark-iana-tz">
            {COMMON_IANA_TIME_ZONES.map((z) => (
              <option key={z} value={z} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={tzSaving}
            className="rounded-lg bg-ark-accent px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-ark-accent/15 transition hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {tzSaving ? '保存中…' : '保存时区'}
          </button>
        </form>
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
