import { Outlet } from 'react-router-dom';

export function AdminLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="shrink-0">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Administration</p>
      </div>
      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <Outlet />
      </div>
    </div>
  );
}
