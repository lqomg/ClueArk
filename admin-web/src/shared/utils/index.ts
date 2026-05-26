import dayjs from 'dayjs';

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : String(value);
}

export function formatJsonDisplay(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function normalizeMessage(message: unknown): string {
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.map((m) => String(m)).join('；');
  if (message && typeof message === 'object' && 'message' in message) {
    return normalizeMessage((message as { message: unknown }).message);
  }
  return '请求失败';
}
