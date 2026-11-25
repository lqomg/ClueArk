import { useTranslation } from 'react-i18next';
import { getAuthFormTone, type AuthFormTone } from '@/components/auth/AuthBrandingLayout';

type OtpSendCodeButtonProps = {
  onClick?: () => void;
  sending: boolean;
  sent: boolean;
  cooldown: number;
  emailReady: boolean;
  type?: 'button' | 'submit';
  tone?: AuthFormTone;
};

export function OtpSendCodeButton({
  onClick,
  sending,
  sent,
  cooldown,
  emailReady,
  type = 'button',
  tone = 'brand',
}: OtpSendCodeButtonProps) {
  const { t } = useTranslation();
  const disabled = !emailReady || sending || cooldown > 0;
  const styles = getAuthFormTone(tone);

  let label: string;
  if (sending) {
    label = t('common.sending');
  } else if (cooldown > 0) {
    label = t('auth.resendInSeconds', { seconds: cooldown });
  } else if (sent) {
    label = t('auth.resendCode');
  } else {
    label = t('auth.sendCode');
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={type === 'button' && onClick ? onClick : undefined}
      className={styles.sendCodeBtnClass}
    >
      {label}
    </button>
  );
}
