import { Link } from 'react-router-dom';
import type { AuthUser } from '@/stores/authStore';
import { userDisplayName, userInitials } from '@/lib/user-display';

export function ShellSidebarUser({ user }: { user: AuthUser }) {
  const name = userDisplayName(user);
  const initials = userInitials(user);

  return (
    <Link
      to="/app/me"
      className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-ark-accent/15 bg-gradient-to-br from-ark-accent/[0.06] to-ark-surface/40 p-3 transition hover:border-ark-accent/30 hover:shadow-[0_0_20px_rgba(0,242,255,0.08)]"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ark-accent/30 bg-ark-accent/10 text-xs font-bold text-ark-accent"
        aria-hidden
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-white">{name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-slate-500">{user.email}</span>
      </span>
    </Link>
  );
}
