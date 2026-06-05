import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, FormField, Input, Select } from '@/components/ui';
import { COMMON_IANA_TIME_ZONES } from '@/lib/datetime';
import { userDisplayName, userInitials } from '@/lib/user-display';
import type { WebSupportedLocale } from '@/lib/localeStorage';
import { FormFeedback } from './FormFeedback';

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{children}</h2>
  );
}

function SectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-4 border-t border-ark-border/80 px-5 py-5 sm:px-6">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </div>
  );
}

export function ProfilePanel({
  email,
  usernameDraft,
  onUsernameChange,
  tzDraft,
  onTzChange,
  localeDraft,
  onLocaleChange,
  onSaveProfile,
  profileDirty,
  profileErr,
  profileMsg,
  profileSaving,
  oldPassword,
  newPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onChangePassword,
  pwdErr,
  pwdMsg,
  pwdLoading,
}: {
  email: string;
  usernameDraft: string;
  onUsernameChange: (value: string) => void;
  tzDraft: string;
  onTzChange: (value: string) => void;
  localeDraft: WebSupportedLocale;
  onLocaleChange: (value: WebSupportedLocale) => void;
  onSaveProfile: (e: React.FormEvent) => void;
  profileDirty: boolean;
  profileErr: string | null;
  profileMsg: string | null;
  profileSaving: boolean;
  oldPassword: string;
  newPassword: string;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onChangePassword: (e: React.FormEvent) => void;
  pwdErr: string | null;
  pwdMsg: string | null;
  pwdLoading: boolean;
}) {
  const { t } = useTranslation();
  const preview = userDisplayName({ email, username: usernameDraft });
  const initials = userInitials({ email, username: usernameDraft });

  return (
    <section className="overflow-hidden rounded-xl border border-ark-border bg-ark-surface/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-4 border-b border-ark-border/80 px-5 py-5 sm:px-6">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-ark-accent/25 bg-ark-accent/10 text-base font-bold text-ark-accent"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-white">{preview}</p>
          <p className="mt-0.5 truncate text-sm text-slate-500">{email}</p>
        </div>
      </div>

      <SectionBlock title={t('profile.title')}>
        <form className="space-y-4" onSubmit={onSaveProfile}>
          {profileErr ? <FormFeedback type="error" message={profileErr} /> : null}
          {profileMsg ? <FormFeedback type="success" message={profileMsg} /> : null}
          <FormField label={t('profile.username')} id="profile-username">
            <Input
              id="profile-username"
              value={usernameDraft}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
              maxLength={64}
              autoComplete="username"
            />
          </FormField>
          <FormField label={t('profile.email')} id="profile-email">
            <Input id="profile-email" value={email} readOnly disabled className="text-slate-400" />
          </FormField>
          <FormField label={t('profile.timezone')} id="profile-timezone">
            <Select
              id="profile-timezone"
              value={tzDraft}
              onChange={(e) => onTzChange(e.target.value)}
              className="font-mono text-xs"
            >
              {COMMON_IANA_TIME_ZONES.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label={t('profile.language')} id="profile-locale">
            <Select
              id="profile-locale"
              value={localeDraft}
              onChange={(e) => onLocaleChange(e.target.value as WebSupportedLocale)}
              className="font-mono text-xs"
            >
              <option value="zh-CN">{t('profile.langZhCN')}</option>
              <option value="en">{t('profile.langEn')}</option>
              <option value="ja">{t('profile.langJa')}</option>
              <option value="ko">{t('profile.langKo')}</option>
            </Select>
          </FormField>
          <div className="flex justify-end pt-1">
            <Button type="submit" variant="primary" size="md" disabled={!profileDirty || profileSaving}>
              {profileSaving ? t('profile.saving') : t('profile.save')}
            </Button>
          </div>
        </form>
      </SectionBlock>

      <SectionBlock title={t('profile.security')}>
        <form className="space-y-4" onSubmit={onChangePassword}>
          {pwdErr ? <FormFeedback type="error" message={pwdErr} /> : null}
          {pwdMsg ? <FormFeedback type="success" message={pwdMsg} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t('profile.oldPassword')} id="profile-old-password">
              <Input
                id="profile-old-password"
                type="password"
                placeholder={t('profile.oldPasswordPlaceholder')}
                value={oldPassword}
                onChange={(e) => onOldPasswordChange(e.target.value)}
                autoComplete="current-password"
              />
            </FormField>
            <FormField label={t('profile.newPassword')} id="profile-new-password">
              <Input
                id="profile-new-password"
                type="password"
                placeholder={t('auth.passwordPlaceholder')}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
          </div>
          <div className="flex justify-end pt-1">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={pwdLoading || !oldPassword || !newPassword}
            >
              {pwdLoading ? t('profile.updatingPassword') : t('profile.updatePassword')}
            </Button>
          </div>
        </form>
      </SectionBlock>
    </section>
  );
}
