import { Link } from 'react-router-dom';
import type { AuthUser } from '@/stores/authStore';
import { userDisplayName, userInitials } from '@/lib/user-display';

export function ShellSidebarUser({ user }: { user: AuthUser }) {
  const name = userDisplayName(user);
  const initials = userInitials(user);

  return (
    <Link
      to="/app/me"
      className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 transition hover:border-neutral-300 hover:bg-white"
    >
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs font-bold text-neutral-700"
        aria-hidden
      >
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-neutral-900">{name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-neutral-500">{user.email}</span>
      </span>
    </Link>
  );
}
