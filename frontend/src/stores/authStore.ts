import { create } from 'zustand';
import type { UserRole } from '@/constants/user-role';
import { normalizeUserTimeZone } from '@/lib/datetime';
import { normalizeLocale, type WebSupportedLocale } from '@/lib/localeStorage';
import type { AuthTokenResponse } from '@/pages/auth/types';

const STORAGE_KEY = 'clueark_auth';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  timeZone: string;
  locale: WebSupportedLocale;
  /** 后端 JWT 校验使用库中角色；普通用户为 user */
  role?: UserRole;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  patchUser: (patch: Partial<Pick<AuthUser, 'username' | 'email' | 'timeZone' | 'locale'>>) => void;
  clear: () => void;
  hydrate: () => void;
}

export function normalizeAuthUser(partial: {
  id: string;
  email: string;
  username: string;
  timeZone?: string | null;
  locale?: string | null;
  role?: UserRole;
}): AuthUser {
  return {
    id: partial.id,
    email: partial.email,
    username: partial.username,
    role: partial.role,
    timeZone: normalizeUserTimeZone(partial.timeZone),
    locale: normalizeLocale(partial.locale),
  };
}

export function authUserFromTokenResponse(data: AuthTokenResponse): AuthUser {
  const uid = data.user.id || data.user._id;
  return normalizeAuthUser({
    id: uid,
    email: data.user.email,
    username: data.user.username,
    role: data.user.role,
    timeZone: data.user.timeZone,
    locale: data.user.locale,
  });
}

function readStorage(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as {
      token?: string;
      user?: Partial<AuthUser> & { id?: string };
    };
    if (!parsed?.token || !parsed?.user?.id || !parsed.user.email || !parsed.user.username) {
      return { token: null, user: null };
    }
    return {
      token: parsed.token,
      user: normalizeAuthUser({
        id: parsed.user.id,
        email: parsed.user.email,
        username: parsed.user.username,
        role: parsed.user.role,
        timeZone: parsed.user.timeZone,
        locale: parsed.user.locale,
      }),
    };
  } catch {
    return { token: null, user: null };
  }
}

const initial = readStorage();

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  setSession: (token, user) => {
    const normalized = normalizeAuthUser(user);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user: normalized }));
    set({ token, user: normalized });
  },
  patchUser: (patch) =>
    set((s) => {
      if (!s.user || !s.token) return s;
      const user = normalizeAuthUser({ ...s.user, ...patch });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: s.token, user }));
      return { user };
    }),
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },
  hydrate: () => {
    const { token, user } = readStorage();
    set({ token, user });
  },
}));
