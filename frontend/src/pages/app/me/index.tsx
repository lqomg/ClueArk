import { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { changePassword as changePasswordApi, getMe, saveProfile } from '@/api/users';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { ProfilePanel } from '@/pages/app/me/components/ProfilePanel';
import { useAuthStore } from '@/stores/authStore';
import { normalizeUserTimeZone } from '@/lib/datetime';
import type { MeResponse } from './types';

const profileSubtitle = '账号信息与安全设置';

function savedUsername(me: MeResponse | null, user: { username?: string } | null): string {
  return (me?.username ?? user?.username ?? '').trim();
}

function savedTimeZone(me: MeResponse | null, user: { timeZone?: string } | null): string {
  return normalizeUserTimeZone(me?.timeZone ?? user?.timeZone);
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [tzDraft, setTzDraft] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMe();
        if (!cancelled) {
          setMe(data);
          setUsernameDraft(data.username ?? '');
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

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <h1 className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-ark-text">
            <User className="size-5 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
            个人中心
          </h1>
          <p className="min-w-0 text-xs leading-snug text-slate-500 md:max-w-2xl md:border-l md:border-ark-border md:pl-4 md:text-sm">
            {profileSubtitle}
          </p>
        </div>
      </div>
    ),
    [],
  );

  const profileDirty = useMemo(() => {
    const username = usernameDraft.trim();
    if (!username) return false;
    return username !== savedUsername(me, user) || tzDraft !== savedTimeZone(me, user);
  }, [usernameDraft, tzDraft, me, user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    const username = usernameDraft.trim();
    if (!username) {
      setProfileErr('用户名不能为空');
      return;
    }
    const timeZone = tzDraft.trim();
    const normalized = normalizeUserTimeZone(timeZone);
    if (normalized !== timeZone) {
      setProfileErr('时区名称无效，请从列表中选择');
      return;
    }
    if (!profileDirty) return;

    setProfileSaving(true);
    try {
      const updated = await saveProfile({ username, timeZone });
      setMe(updated);
      setUsernameDraft(updated.username);
      setTzDraft(normalizeUserTimeZone(updated.timeZone));
      patchUser({ username: updated.username, timeZone: updated.timeZone });
      setProfileMsg('资料已保存');
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : '保存失败');
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdErr(null);
    setPwdMsg(null);
    setPwdLoading(true);
    try {
      await changePasswordApi({ oldPassword, newPassword });
      setPwdMsg('密码已更新');
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      setPwdErr(e instanceof Error ? e.message : '修改失败');
    } finally {
      setPwdLoading(false);
    }
  }

  const email = me?.email ?? user?.email ?? '';

  return (
    <div className="scrollbar-hide mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-y-auto overscroll-y-contain pb-8 pt-1">
      <ProfilePanel
        email={email}
        usernameDraft={usernameDraft}
        onUsernameChange={(value) => {
          setUsernameDraft(value);
          setProfileMsg(null);
          setProfileErr(null);
        }}
        tzDraft={tzDraft}
        onTzChange={(value) => {
          setTzDraft(value);
          setProfileMsg(null);
          setProfileErr(null);
        }}
        onSaveProfile={handleSaveProfile}
        profileDirty={profileDirty}
        profileErr={profileErr}
        profileMsg={profileMsg}
        profileSaving={profileSaving}
        oldPassword={oldPassword}
        newPassword={newPassword}
        onOldPasswordChange={setOldPassword}
        onNewPasswordChange={setNewPassword}
        onChangePassword={changePassword}
        pwdErr={pwdErr}
        pwdMsg={pwdMsg}
        pwdLoading={pwdLoading}
      />
    </div>
  );
}
