import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { GithubRepoLink } from '@/components/GithubRepoLink';

type AppTopBarContextValue = {
  setSlot: (node: ReactNode | null) => void;
};

const AppTopBarContext = createContext<AppTopBarContextValue | null>(null);

/** 与 demo TopBar 一致 */
export const APP_TOPBAR_HEIGHT_CLASS = 'h-16';

export function AppTopBarProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotState] = useState<ReactNode | null>(null);
  const setSlot = useCallback((node: ReactNode | null) => {
    setSlotState(node);
  }, []);
  const value = useMemo(() => ({ setSlot }), [setSlot]);

  return (
    <AppTopBarContext.Provider value={value}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <header
          className={`${APP_TOPBAR_HEIGHT_CLASS} z-10 flex shrink-0 items-center justify-between border-b border-ark-border bg-ark-bg px-6`}
        >
          <div className="flex min-h-0 min-w-0 flex-1 items-center gap-4 overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
            {slot}
          </div>
          <div className="ml-4 hidden shrink-0 items-center gap-4 md:flex">
            <GithubRepoLink
              showUrl={false}
              iconSize={20}
              className="text-slate-500 transition-colors hover:text-ark-text"
            />
            <Link
              to="/app/me"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-ark-border bg-ark-surface text-slate-500 shadow-sm transition-all hover:border-white/20 hover:text-ark-text"
              aria-label="个人中心"
              title="个人中心"
            >
              <User className="size-4" strokeWidth={2} />
            </Link>
          </div>
        </header>
        {children}
      </div>
    </AppTopBarContext.Provider>
  );
}

/**
 * 将当前页顶部操作区注册到全局 TopBar。deps 须覆盖 render 中读取的状态，避免栏内展示过期。
 */
export function useAppTopBar(render: () => ReactNode, deps: DependencyList) {
  const ctx = useContext(AppTopBarContext);
  if (!ctx) {
    throw new Error('useAppTopBar 须在 AppTopBarProvider 内使用');
  }
  const { setSlot } = ctx;
  const renderRef = useRef(render);
  renderRef.current = render;
  useLayoutEffect(() => {
    setSlot(renderRef.current());
    return () => setSlot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 由调用方通过 deps 控制更新时机
  }, deps);
}
