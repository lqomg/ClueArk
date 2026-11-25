/** 打开外链；无效 URL 时静默忽略。 */
export function openExternalUrl(raw: string): void {
  const url = String(raw ?? '').trim();
  if (!url) return;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
    window.open(parsed.toString(), '_blank', 'noopener,noreferrer');
  } catch {
    /* ignore invalid */
  }
}
