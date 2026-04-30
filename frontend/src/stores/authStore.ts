import { create } from 'zustand';

const STORAGE_KEY = 'clueark_auth';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  /** 后端 JWT 校验使用库中角色；普通用户为 user */
  role?: 'user' | 'admin';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
  hydrate: () => void;
}

function readStorage(): { token: string | null; user: AuthUser | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as { token?: string; user?: AuthUser };
    if (!parsed?.token || !parsed?.user?.id) return { token: null, user: null };
    return { token: parsed.token, user: parsed.user };
  } catch {
    return { token: null, user: null };
  }
}

const initial = readStorage();

export const useAuthStore = create<AuthState>((set) => ({
  token: initial.token,
  user: initial.user,
  setSession: (token, user) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    set({ token, user });
  },
  clear: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, user: null });
  },
  hydrate: () => {
    const { token, user } = readStorage();
    set({ token, user });
  },
}));
