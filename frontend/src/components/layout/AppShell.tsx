import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bookmark, Database, Layers, LayoutDashboard, ListTree, LogOut, Newspaper, User, Users } from 'lucide-react';
import { ProductMark } from '@/components/brand/ProductMark';
import { GithubRepoLink } from '@/components/GithubRepoLink';
import { AppTopBarProvider } from '@/components/layout/AppTopBar';
import { useAuthStore } from '@/stores/authStore';
import { USER_ROLE } from '@/constants/user-role';
import { isStaffRole } from '@/utils/auth-roles';

function shellNavClass(isActive: boolean) {
  return `flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${isActive ? 'bg-white/10 text-ark-accent' : 'text-slate-400 hover:bg-white/5 hover:text-ark-text'
    }`;
}

function shellNavIconClass(isActive: boolean) {
  return `shrink-0 ${isActive ? 'text-ark-accent' : 'text-slate-500'}`;
}

export function AppShell() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const navigate = useNavigate();
  const isStaffUser = isStaffRole(user?.role);
  const isAdminUser = user?.role === USER_ROLE.Admin;

  function logout() {
    clear();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-ark-bg font-sans text-white md:h-screen md:flex-row md:overflow-hidden">
      <aside className="hidden w-56 shrink-0 flex-col border-ark-border bg-ark-sidebar md:flex md:border-r">
        <div className="p-6">
          <ProductMark variant="sidebar" to="/app/feed" className="mb-10" />

          <nav className="space-y-1">
            <NavLink to="/app/feed" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <Newspaper size={18} className={shellNavIconClass(isActive)} />
                  动态
                </>
              )}
            </NavLink>
            <NavLink to="/app/sources" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <Bookmark size={18} className={shellNavIconClass(isActive)} />
                  信源
                </>
              )}
            </NavLink>
            <NavLink to="/app/monitors" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <LayoutDashboard size={18} className={shellNavIconClass(isActive)} />
                  监控总览
                </>
              )}
            </NavLink>
            <NavLink to="/app/monitors/manage" end className={({ isActive }) => shellNavClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ListTree size={18} className={shellNavIconClass(isActive)} />
                  监控管理
                </>
              )}
            </NavLink>
            {isStaffUser ? (
              <div className="mt-4 border-t border-ark-border pt-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  管理
                </p>
                <div className="space-y-1">
                  {isAdminUser ? (
                    <NavLink to="/app/admin/users" end className={({ isActive }) => shellNavClass(isActive)}>
                      {({ isActive }) => (
                        <>
                          <Users size={18} className={shellNavIconClass(isActive)} />
                          用户管理
                        </>
                      )}
                    </NavLink>
                  ) : null}
                  <NavLink to="/app/admin/sources" end={false} className={({ isActive }) => shellNavClass(isActive)}>
                    {({ isActive }) => (
                      <>
                        <Database size={18} className={shellNavIconClass(isActive)} />
                        信源管理
                      </>
                    )}
                  </NavLink>
                  <NavLink
                    to="/app/admin/aggregation-policy"
                    end
                    className={({ isActive }) => shellNavClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <Layers size={18} className={shellNavIconClass(isActive)} />
                        聚合策略
                      </>
                    )}
                  </NavLink>
                </div>
              </div>
            ) : null}
          </nav>
        </div>

        <div className="mt-auto flex flex-col border-t border-ark-border">
          <div className="px-4 py-3">
            <GithubRepoLink className="w-full justify-center px-2 py-1.5 hover:bg-white/5" />
          </div>
          <div className="border-t border-ark-border p-4">
            <button
              type="button"
              className="group flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-500 transition-colors hover:text-white"
              onClick={logout}
            >
              <LogOut size={18} className="transition-transform group-hover:-translate-x-0.5" />
              退出登录
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 space-y-2 border-b border-ark-border bg-ark-sidebar px-4 py-3 md:hidden">
          <div className="flex items-center justify-between">
            <ProductMark variant="compact" to="/app/feed" />
            <div className="flex items-center gap-3">
              <GithubRepoLink showUrl={false} iconSize={20} className="text-slate-500 hover:text-ark-accent" />
              <button type="button" className="text-xs text-slate-500 hover:text-ark-accent" onClick={logout}>
                退出
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/feed">
              <Newspaper size={14} />
              动态
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/sources">
              <Bookmark size={14} />
              信源
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/monitors">
              <LayoutDashboard size={14} />
              监控总览
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/monitors/manage">
              <ListTree size={14} />
              监控管理
            </Link>
            <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/me">
              <User size={14} />
              我的
            </Link>
            {isStaffUser ? (
              <>
                <span className="hidden h-3 w-px bg-ark-border sm:inline" aria-hidden />
                {isAdminUser ? (
                  <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/admin/users">
                    <Users size={14} />
                    用户
                  </Link>
                ) : null}
                <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/admin/sources">
                  <Database size={14} />
                  信源管理
                </Link>
                <Link className="inline-flex items-center gap-1 hover:text-ark-text" to="/app/admin/aggregation-policy">
                  <Layers size={14} />
                  策略
                </Link>
              </>
            ) : null}
          </div>
        </header>

        <AppTopBarProvider>
          <main
            id="app-main-scroll"
            className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4 md:px-6 md:py-4"
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
