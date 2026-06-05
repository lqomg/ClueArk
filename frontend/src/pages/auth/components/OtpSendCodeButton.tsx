import { useTranslation } from 'react-i18next';
import { sendCodeBtnClass } from '@/components/auth/AuthBrandingLayout';

type OtpSendCodeButtonProps = {
  onClick?: () => void;
  sending: boolean;
  sent: boolean;
  cooldown: number;
  emailReady: boolean;
  type?: 'button' | 'submit';
};

export function OtpSendCodeButton({
  onClick,
  sending,
  sent,
  cooldown,
  emailReady,
  type = 'button',
}: OtpSendCodeButtonProps) {
  const { t } = useTranslation();
  const disabled = !emailReady || sending || cooldown > 0;

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
      className={sendCodeBtnClass}
    >
      {label}
    </button>
  );
}
