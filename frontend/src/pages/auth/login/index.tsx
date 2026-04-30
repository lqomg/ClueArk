import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login as loginApi } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';
import {
  AuthBrandingLayout,
  inputClass,
  primaryBtnClass,
} from '@/components/auth/AuthBrandingLayout';
import { authErrBoxClass } from '../utils';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || '/app/sources';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginApi({ account, password });
      const uid = data.user.id || data.user._id;
      setSession(data.access_token, {
        id: uid,
        email: data.user.email,
        username: data.user.username,
        role: data.user.role,
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthBrandingLayout title="登入控制台" subtitle="请验证您的身份，访问结构化情报资产">
      <form className="space-y-4" onSubmit={onSubmit}>
        {error ? <div className={authErrBoxClass}>{error}</div> : null}
        <div className="space-y-2">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            邮箱或用户名 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            className={inputClass}
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="username"
            placeholder="控制台账号"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="pl-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            密码 <span className="text-ark-accent opacity-60">*</span>
          </label>
          <input
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="接入密钥"
            required
          />
        </div>
        <div className="flex justify-end pr-1 pt-1">
          <Link
            to="/forgot-password"
            className="text-[10px] font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
          >
            忘记密钥？
          </Link>
        </div>
        <button type="submit" disabled={loading} className={primaryBtnClass}>
          <span className="relative z-10">{loading ? '执行中…' : '执行登入'}</span>
        </button>
      </form>

      <div className="relative pt-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/5" />
        </div>
        <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.3em] text-slate-600">
          <span className="bg-ark-bg px-4">新终端</span>
        </div>
      </div>

      <div className="text-center">
        <Link
          to="/register"
          className="text-xs font-bold tracking-widest text-slate-500 transition-colors hover:text-ark-accent"
        >
          还没有账号？立即注册
        </Link>
      </div>
    </AuthBrandingLayout>
  );
}
