import { useState } from 'react';
import { Link } from 'react-router-dom';
import { confirmPasswordReset, sendPasswordResetCode } from '@/api/auth';
import {
  AuthBrandingLayout,
  inputClass,
  primaryBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { authErrBoxClass, authOkBoxClass } from '../utils';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await sendPasswordResetCode({ email });
      setMessage('若邮箱已注册，验证码已生成。开发环境请查看后端日志中的验证码。');
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await confirmPasswordReset({ email, code, newPassword });
      setMessage('密码已重置，请使用新密码登录。');
    } catch (err) {
      setError(err instanceof Error ? err.message : '重置失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandingLayout title="密钥恢复" subtitle="通过邮箱验证码重置（验证码 15 分钟内有效）">
      {error ? <div className={authErrBoxClass}>{error}</div> : null}
      {message ? <div className={authOkBoxClass}>{message}</div> : null}

      {step === 'email' ? (
        <form className="space-y-4" onSubmit={sendCode}>
          <div className="space-y-2">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              注册邮箱 <span className="text-ark-accent opacity-60">*</span>
            </label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            <span className="relative z-10">{loading ? '发送中…' : '发送验证码'}</span>
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={resetPassword}>
          <div className="space-y-2">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">邮箱</label>
            <input
              type="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              6 位验证码
            </label>
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              placeholder="000000"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              新密码（至少 6 位）
            </label>
            <input
              type="password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            <span className="relative z-10">{loading ? '提交中…' : '重置密码'}</span>
          </button>
        </form>
      )}

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          返回登录
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
