import {
  normalizePublishedAtWithPrecision,
  resolveWebListPublishedAt,
  utcMidnightFromYmd,
} from './published-at.util';

describe('normalizePublishedAtWithPrecision', () => {
  const now = new Date('2026-10-30T12:00:00.000Z');

  it('marks YYYY-MM-DD as day with UTC midnight', () => {
    const r = normalizePublishedAtWithPrecision('2026-10-28', { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('day');
    expect(r!.date.toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });

  it('marks Chinese date-only as day', () => {
    const r = normalizePublishedAtWithPrecision('2026年10月28日', { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('day');
    expect(r!.date.toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });

  it('marks English month date-only as day', () => {
    const r = normalizePublishedAtWithPrecision('Oct 28, 2026', { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('day');
    expect(r!.date.toISOString()).toBe('2026-10-28T00:00:00.000Z');
  });

  it('marks ISO datetime as instant', () => {
    const r = normalizePublishedAtWithPrecision('2026-10-28T14:30:00.000Z', { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('instant');
    expect(r!.date.toISOString()).toBe('2026-10-28T14:30:00.000Z');
  });

  it('marks Chinese datetime as instant', () => {
    const r = normalizePublishedAtWithPrecision('2026-10-28 14:30', { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('instant');
  });

  it('marks relative time as instant', () => {
    const r = normalizePublishedAtWithPrecision('5分钟前', { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('instant');
  });

  it('marks timestamp number as instant', () => {
    const r = normalizePublishedAtWithPrecision(1761657000000, { now });
    expect(r).not.toBeNull();
    expect(r!.precision).toBe('instant');
  });
});

describe('utcMidnightFromYmd', () => {
  it('returns UTC midnight for valid ymd', () => {
    expect(utcMidnightFromYmd(2026, 10, 28)?.toISOString()).toBe(
      '2026-10-28T00:00:00.000Z',
    );
  });

  it('rejects invalid calendar days', () => {
    expect(utcMidnightFromYmd(2026, 2, 31)).toBeNull();
  });
});

describe('resolveWebListPublishedAt', () => {
  const now = new Date('2026-11-20T12:00:00.000Z');

  it('returns null when publishedAt is missing (never invent scrape time)', () => {
    expect(resolveWebListPublishedAt(null, now)).toBeNull();
    expect(resolveWebListPublishedAt(undefined, now)).toBeNull();
  });

  it('keeps a real publishedAt', () => {
    const d = new Date('2024-04-03T00:00:00.000Z');
    const r = resolveWebListPublishedAt(d, now);
    expect(r?.date.toISOString()).toBe('2024-04-03T00:00:00.000Z');
  });

  it('returns null for future dates instead of capping to scrape time', () => {
    // 政策截止日列常被误配成 publishedAt；不得压成 now
    expect(resolveWebListPublishedAt(new Date('2027-01-27T00:00:00.000Z'), now)).toBeNull();
  });
});
