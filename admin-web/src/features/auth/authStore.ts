import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/shared/types';
import { USER_ROLE } from '@/shared/constants';

type AuthState = {
  token: string | null;
  user: AdminUser | null;
  authReady: boolean;
  setSession: (token: string, user: AdminUser) => void;
  clear: () => void;
  setAuthReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      authReady: false,
      setSession: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
      setAuthReady: (authReady) => set({ authReady }),
    }),
    {
      name: 'clueark_admin_auth',
      partialize: (s) => ({ token: s.token, user: s.user }),
    },
  ),
);

export function isAdminSession(user: AdminUser | null | undefined): boolean {
  return user?.role === USER_ROLE.Admin;
}
