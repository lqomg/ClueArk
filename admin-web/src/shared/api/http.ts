import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/features/auth/authStore';
import { normalizeMessage } from '@/shared/utils';

const baseURL = import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function unwrapBody(status: number, raw: unknown): unknown {
  let body: unknown = raw;
  if (typeof body === 'string') {
    const text = body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError(text || 'invalid_json', status);
    }
  }
  if (body == null || typeof body !== 'object') {
    return body;
  }
  const b = body as Record<string, unknown>;
  if ('code' in b && b.code !== 200) {
    throw new ApiError(normalizeMessage(b.message), Number(b.code) || status);
  }
  if ('data' in b) {
    return b.data;
  }
  return body;
}

export const http = axios.create({
  baseURL,
  headers: { Accept: 'application/json' },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  const data = config.data;
  if (data != null && !(data instanceof FormData) && !config.headers.get('Content-Type')) {
    config.headers.set('Content-Type', 'application/json');
  }
  return config;
});

http.interceptors.response.use(
  (response: AxiosResponse) => {
    const inner = unwrapBody(response.status, response.data);
    response.data = inner;
    return response;
  },
  (error: AxiosError<Record<string, unknown>>) => {
    const res = error.response;
    const status = res?.status ?? 0;
    if (status === 401) {
      useAuthStore.getState().clear();
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (!path.startsWith('/login')) {
          const next = encodeURIComponent(path + window.location.search);
          window.location.replace(`/login?from=${next}`);
        }
      }
    }
    if (res?.data !== undefined) {
      try {
        unwrapBody(status, res.data);
      } catch (e) {
        if (e instanceof ApiError) return Promise.reject(e);
      }
      const msg = normalizeMessage(
        typeof res.data === 'object' && res.data !== null && 'message' in res.data
          ? (res.data as { message: unknown }).message
          : res.data,
      );
      return Promise.reject(new ApiError(msg, status));
    }
    return Promise.reject(new ApiError(error.message || '网络错误', status));
  },
);

export function toUser(raw: Record<string, unknown>): import('@/shared/types').AdminUser {
  const id = String(raw.id ?? raw._id ?? '');
  return {
    id,
    email: String(raw.email ?? ''),
    username: String(raw.username ?? ''),
    role: String(raw.role ?? 'user') as import('@/shared/types').AdminUser['role'],
    isActive: raw.isActive !== false,
    timeZone: typeof raw.timeZone === 'string' ? raw.timeZone : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  };
}
