import { useCallback, useEffect, useState } from 'react';
import { OTP_RESEND_COOLDOWN_SEC } from '@/pages/auth/constants';

/** 发码成功后倒计时，与后端 60s 重发限制一致 */
export function useOtpResendCooldown(defaultSeconds = OTP_RESEND_COOLDOWN_SEC) {
  const [remaining, setRemaining] = useState(0);

  const startCooldown = useCallback(
    (seconds = defaultSeconds) => {
      setRemaining(Math.max(0, Math.floor(seconds)));
    },
    [defaultSeconds],
  );

  const resetCooldown = useCallback(() => {
    setRemaining(0);
  }, []);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining((n) => (n <= 1 ? 0 : n - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  return {
    remaining,
    canResend: remaining === 0,
    startCooldown,
    resetCooldown,
  };
}
