import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { GithubRepoLink } from '@/components/GithubRepoLink';
import { useAuthStore } from '@/stores/authStore';
import type { AuthTokenResponse, PublicAuthIntent } from '@/pages/auth/types';
import { PublicExamples } from './components/PublicExamples';
import { PublicFaq } from './components/PublicFaq';
import { PublicHeader } from './components/PublicHeader';
import { PublicManifesto } from './components/PublicManifesto';

export function PublicDiscoveryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const token = useAuthStore((state) => state.token);
  const [authIntent, setAuthIntent] = useState<PublicAuthIntent | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const openLogin = useCallback((intent: PublicAuthIntent) => setAuthIntent(intent), []);
  const closeAuth = useCallback(() => setAuthIntent(null), []);

  useEffect(() => {
    if (token) return;
    const auth = searchParams.get('auth');
    if (auth !== 'login' && auth !== 'register') return;
    const fromRaw = (searchParams.get('from') || '').trim();
    let from = fromRaw;
    try {
      from = decodeURIComponent(fromRaw);
    } catch {
      /* keep raw */
    }
    const redirect =
      from && from.startsWith('/') && !from.startsWith('//') && !from.startsWith('/login')
        ? from
        : '/app/home';
    if (auth === 'register') {
      openLogin({ type: 'register', label: t('auth.register'), redirect });
    } else {
      openLogin({ type: 'login', label: t('public.loginContext'), redirect });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('auth');
    next.delete('from');
    setSearchParams(next, { replace: true });
  }, [openLogin, searchParams, setSearchParams, t, token]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = searchRef.current?.value.trim() ?? '';
    if (!prompt) {
      searchRef.current?.focus();
      return;
    }
    if (!token) {
      openLogin({ type: 'create', prompt, label: `${t('public.startCreate')}：${prompt}` });
      return;
    }
    navigate(`/app/home?intent=${encodeURIComponent(prompt)}`);
  }

  function handleCreate() {
    if (token) {
      navigate('/app/home');
      return;
    }
    openLogin({ type: 'create', prompt: '', label: t('public.startCreate') });
  }

  function handleExample(prompt: string) {
    const text = prompt.trim();
    if (!text) return;
    if (!token) {
      openLogin({ type: 'create', prompt: text, label: `${t('public.startCreate')}：${text}` });
      return;
    }
    navigate(`/app/home?intent=${encodeURIComponent(text)}`);
  }

  async function handleAuthComplete(_data: AuthTokenResponse, intent: PublicAuthIntent) {
    setAuthIntent(null);
    if (intent.type === 'create') {
      navigate(
        intent.prompt ? `/app/home?intent=${encodeURIComponent(intent.prompt)}` : '/app/home',
        { replace: true },
      );
      return;
    }
    navigate(
      (intent.type === 'login' || intent.type === 'register' ? intent.redirect : undefined) ||
        '/app/home',
      { replace: true },
    );
  }

  return (
    <div className="public-discovery min-h-dvh bg-ark-bg text-ark-text">
      <PublicHeader loggedIn={!!token} onCreate={handleCreate} />
      <main>
        <section className="border-b border-neutral-100 px-4 pb-8 pt-8 sm:px-6 sm:pb-16 sm:pt-24">
          <div className="mx-auto w-full max-w-[780px] text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[11px] font-medium tracking-wide text-neutral-500 sm:px-3.5 sm:py-1.5 sm:text-[12px]">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              {t('public.discoveryEyebrow')}
            </p>
            <h1 className="mt-4 text-[1.75rem] font-semibold leading-[1.2] tracking-tight text-neutral-900 sm:mt-6 sm:text-[2.8rem] sm:leading-[1.18]">
              {t('public.discoveryTitle')}
            </h1>
            <p className="mx-auto mt-3 max-w-[40rem] text-[14px] leading-relaxed text-neutral-500 sm:mt-4 sm:text-[17px] sm:leading-[1.75]">
              {t('public.discoverySubtitle')}
            </p>
            <form
              className="mx-auto mt-6 flex w-full max-w-[760px] flex-col gap-2.5 sm:mt-9 sm:flex-row"
              onSubmit={handleSearch}
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-neutral-400"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  className="h-11 w-full rounded-full border border-neutral-200 bg-white pl-11 pr-4 text-[14px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 sm:h-[54px] sm:text-[15px]"
                  placeholder={t('public.searchPlaceholder')}
                  aria-label={t('public.searchPlaceholder')}
                />
              </div>
              <button
                className="btn-primary inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-[13px] font-medium sm:h-[54px] sm:w-auto sm:px-6 sm:text-[14px]"
                type="submit"
              >
                {t('public.searchAction')}
                <ArrowUpRight className="size-4" aria-hidden />
              </button>
            </form>
            <p className="mt-3 text-[12px] text-neutral-400 sm:mt-[18px] sm:text-[13px]">
              {t('public.heroHint')}
            </p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-[12px] text-neutral-500 sm:mt-7 sm:gap-2 sm:text-[13px]">
              {[t('public.officialUpdated'), t('public.importantOnly'), t('public.noComplexSetup')].map(
                (label) => (
                  <li
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-neutral-50 px-2.5 py-1.5 sm:px-3.5 sm:py-2"
                  >
                    <Check className="size-3.5 text-emerald-600 sm:size-4" aria-hidden />
                    {label}
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>
        <section className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 sm:py-12 lg:px-10">
          <div className="mx-auto w-full max-w-[1120px] space-y-10 sm:space-y-12">
            <PublicExamples onSelect={handleExample} />
            <PublicManifesto />
          </div>
          <PublicFaq />
        </section>
      </main>
      <footer className="border-t border-neutral-100 px-4 py-5 text-[11px] text-neutral-400 sm:px-6 sm:py-6">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col justify-between gap-3 sm:flex-row sm:items-center lg:px-4">
          <span>观枢 ClueArk · open source</span>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2" aria-label={t('public.navLabel')}>
            <GithubRepoLink className="text-neutral-400 hover:text-neutral-700 [&_span]:text-neutral-400" />
            <a href="/legal/terms" className="transition hover:text-neutral-700">
              {t('legal.termsTitle')}
            </a>
            <a href="/legal/privacy" className="transition hover:text-neutral-700">
              {t('legal.privacyTitle')}
            </a>
          </nav>
        </div>
      </footer>
      <AuthDialog intent={authIntent} onClose={closeAuth} onComplete={handleAuthComplete} />
    </div>
  );
}
