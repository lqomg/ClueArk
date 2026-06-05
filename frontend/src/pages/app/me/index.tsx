import { useEffect, useMemo, useState } from 'react';
import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { changePassword as changePasswordApi, getMe, saveProfile } from '@/api/users';
import { useAppTopBar } from '@/components/layout/AppTopBar';
import { ProfilePanel } from '@/pages/app/me/components/ProfilePanel';
import { useAuthStore } from '@/stores/authStore';
import { normalizeUserTimeZone } from '@/lib/datetime';
import { getWebLocale, normalizeLocale, type WebSupportedLocale } from '@/lib/localeStorage';
import { changeWebLanguage } from '@/i18n';
import type { MeResponse } from './types';

function savedUsername(me: MeResponse | null, user: { username?: string } | null): string {
  return (me?.username ?? user?.username ?? '').trim();
}

function savedTimeZone(me: MeResponse | null, user: { timeZone?: string } | null): string {
  return normalizeUserTimeZone(me?.timeZone ?? user?.timeZone);
}

function savedLocale(me: MeResponse | null, user: { locale?: string } | null): WebSupportedLocale {
  return normalizeLocale(me?.locale ?? user?.locale ?? getWebLocale());
}

export function ProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const patchUser = useAuthStore((s) => s.patchUser);
  const setSession = useAuthStore((s) => s.setSession);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [usernameDraft, setUsernameDraft] = useState('');
  const [tzDraft, setTzDraft] = useState('');
  const [localeDraft, setLocaleDraft] = useState<WebSupportedLocale>(getWebLocale());
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
          const locale = savedLocale(data, null);
          setLocaleDraft(locale);
          changeWebLanguage(locale);
          patchUser({
            username: data.username,
            email: data.email,
            timeZone: data.timeZone,
            locale: data.locale,
          });
        }
      } catch {
        if (!cancelled) setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patchUser]);

  useAppTopBar(
    () => (
      <div className="flex min-w-0 w-full items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-center md:gap-4">
          <h1 className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight text-ark-text">
            <User className="size-5 shrink-0 text-ark-accent" strokeWidth={2} aria-hidden />
            {t('profile.title')}
          </h1>
          <p className="min-w-0 text-xs leading-snug text-slate-500 md:max-w-2xl md:border-l md:border-ark-border md:pl-4 md:text-sm">
            {t('profile.subtitle')}
          </p>
        </div>
      </div>
    ),
    [t],
  );

  const profileDirty = useMemo(() => {
    const username = usernameDraft.trim();
    if (!username) return false;
    return (
      username !== savedUsername(me, user) ||
      tzDraft !== savedTimeZone(me, user) ||
      localeDraft !== savedLocale(me, user)
    );
  }, [usernameDraft, tzDraft, localeDraft, me, user]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    const username = usernameDraft.trim();
    if (!username) {
      setProfileErr(t('profile.username') + ' required');
      return;
    }
    const timeZone = tzDraft.trim();
    const normalized = normalizeUserTimeZone(timeZone);
    if (normalized !== timeZone) {
      setProfileErr('Invalid timezone');
      return;
    }
    if (!profileDirty) return;

    setProfileSaving(true);
    try {
      const updated = await saveProfile({ username, timeZone, locale: localeDraft });
      setMe(updated);
      setUsernameDraft(updated.username);
      setTzDraft(normalizeUserTimeZone(updated.timeZone));
      const nextLocale = savedLocale(updated, null);
      setLocaleDraft(nextLocale);
      changeWebLanguage(nextLocale);
      patchUser({ username: updated.username, timeZone: updated.timeZone, locale: updated.locale });
      setProfileMsg(t('profile.saved'));
    } catch (e) {
      setProfileErr(e instanceof Error ? e.message : 'Save failed');
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
      const res = await changePasswordApi({ oldPassword, newPassword });
      // 后端改密后旧 token 失效，用返回的新 token 刷新会话以避免被登出
      if (res?.access_token && user) {
        setSession(res.access_token, user);
      }
      setPwdMsg('Password updated');
      setOldPassword('');
      setNewPassword('');
    } catch (e) {
      setPwdErr(e instanceof Error ? e.message : 'Update failed');
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
        localeDraft={localeDraft}
        onLocaleChange={(value) => {
          setLocaleDraft(value);
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
