import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import {
  AuthBrandingLayout,
  inputClass,
  primaryBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { authErrBoxClass } from '../utils';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptTerms) {
      setError('请先阅读并勾选同意用户协议与隐私政策');
      return;
    }
    setLoading(true);
    try {
      const data = await registerApi({ email, password, confirmPassword, acceptTerms });
      const uid = data.user.id || data.user._id;
      setSession(data.access_token, {
        id: uid,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
      });
      navigate('/app/sources', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandingLayout
      title="开启方舟计划"
      subtitle="使用邮箱注册，无需手机号"
      showLegalFooter={false}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        {error ? <div className={authErrBoxClass}>{error}</div> : null}
        <div className="space-y-2">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            邮箱 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            type="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="name@company.com"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            密码（至少 6 位） <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="至少 6 位"
            required
            minLength={6}
          />
        </div>
        <div className="space-y-2">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            确认密码 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            type="password"
            className={inputClass}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="再次输入"
            required
            minLength={6}
          />
        </div>
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-slate-400">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
          />
          <span>
            我已阅读并同意
            <Link to="/legal/terms" className="mx-1 text-ark-accent hover:underline" target="_blank">
              《用户服务协议》
            </Link>
            与
            <Link to="/legal/privacy" className="mx-1 text-ark-accent hover:underline" target="_blank">
              《隐私政策》
            </Link>
          </span>
        </label>
        <button type="submit" disabled={loading} className={primaryBtnClass}>
          <span className="relative z-10">{loading ? '提交中…' : '注册并登录'}</span>
        </button>
      </form>

      <div className="text-center">
        <Link
          to="/login"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          已有账号？返回终端登录
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
