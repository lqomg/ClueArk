import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Bookmark, Home, LayoutDashboard, LayoutList, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProductMark } from '@/components/brand/ProductMark';
import { GithubRepoLink } from '@/components/GithubRepoLink';
import { ShellSidebarUser } from '@/components/layout/ShellSidebarUser';
import { AppTopBarProvider } from '@/components/layout/AppTopBar';
import { EnvironmentBanner } from '@/components/layout/EnvironmentNotice';
import { useNotificationUnread } from '@/hooks/useNotificationUnread';
import { useAuthStore } from '@/stores/authStore';

function shellNavClass(isActive: boolean) {
  return [
    'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200',
    isActive
      ? 'border border-ark-accent/30 bg-ark-accent/10 text-ark-accent shadow-[0_0_20px_rgba(0,242,255,0.14)] ring-1 ring-ark-accent/15'
      : 'border border-transparent text-slate-500 hover:bg-white/[0.03] hover:text-slate-300',
  ].join(' ');
}

function shellNavIconClass(isActive: boolean) {
  return `shrink-0 ${isActive ? 'text-ark-accent' : 'text-slate-600'}`;
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[1.25rem] rounded-full bg-ark-accent px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-ark-bg">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function AppShell() {
  const clear = useAuthStore((s) => s.clear);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const { count: unreadCount } = useNotificationUnread();
  const { t } = useTranslation();

  function logout() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-ark-bg font-sans text-white md:h-screen md:flex-row md:overflow-hidden">
      <aside className="hidden w-56 shrink-0 flex-col border-ark-border bg-ark-sidebar md:flex md:border-r">
        <div className="p-6">
          <ProductMark variant="sidebar" to="/app/home" className="mb-3" />
          <p className="mb-8 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            {t('app.tagline')}
          </p>

          <nav className="space-y-1">
            <NavLink to="/app/home" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <Home size={18} className={shellNavIconClass(isActive)} />
                  {t('nav.home')}
                </>
              )}
            </NavLink>

            <NavLink to="/app/monitors" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <LayoutDashboard size={18} className={shellNavIconClass(isActive)} />
                  {t('nav.monitors')}
                </>
              )}
            </NavLink>

            <NavLink to="/app/monitors/manage" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <LayoutList size={18} className={shellNavIconClass(isActive)} />
                  {t('nav.manage')}
                </>
              )}
            </NavLink>

            <NavLink to="/app/notifications" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <Bell size={18} className={shellNavIconClass(isActive)} />
                  <span className="min-w-0 flex-1 text-left">{t('nav.notifications')}</span>
                  <UnreadBadge count={unreadCount} />
                </>
              )}
            </NavLink>
            <NavLink to="/app/sources" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <Bookmark size={18} className={shellNavIconClass(isActive)} />
                  {t('nav.sources')}
                </>
              )}
            </NavLink>
          </nav>
        </div>

        <div className="mt-auto flex flex-col border-t border-ark-border pt-3">
          {user ? <ShellSidebarUser user={user} /> : null}
          <div className="px-4 pb-2">
            <GithubRepoLink className="w-full justify-center px-2 py-1.5 hover:bg-white/5" />
          </div>
          <div className="border-t border-ark-border p-4">
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:text-white"
              onClick={logout}
            >
              <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <EnvironmentBanner />
        <header className="shrink-0 space-y-2 border-b border-ark-border bg-ark-sidebar px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <ProductMark variant="compact" to="/app/home" />
            <div className="flex items-center gap-3">
              <GithubRepoLink showUrl={false} iconSize={20} className="text-slate-500 hover:text-ark-accent" />
              <button type="button" className="text-xs text-slate-500 hover:text-ark-accent" onClick={logout}>
                {t('nav.logout')}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/home">
              <Home size={14} />
              {t('nav.home')}
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/monitors">
              <LayoutDashboard size={14} />
              {t('nav.monitors')}
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/monitors/manage">
              <LayoutList size={14} />
              {t('nav.manage')}
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/notifications">
              <Bell size={14} />
              {t('nav.notifications')}
              {unreadCount > 0 ? (
                <span className="rounded-full bg-ark-accent/20 px-1.5 text-[10px] font-medium text-ark-accent">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null}
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/sources">
              <Bookmark size={14} />
              {t('nav.sources')}
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/me">
              <User size={14} />
              {t('nav.profile')}
            </Link>
          </div>
        </header>

        <AppTopBarProvider>
          <main
            id="app-main-scroll"
            className="flex min-h-0 flex-1 flex-col overflow-hidden bg-ark-content px-4 py-4 md:px-6 md:py-4"
          >
            <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden">
              <Outlet />
            </div>
          </main>
        </AppTopBarProvider>
      </div>
    </div>
  );
}
