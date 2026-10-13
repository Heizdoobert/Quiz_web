import { describe, it, expect } from 'vitest';
import {
  canonicalUrl,
  formatCompact,
  formatDate,
  formatDuration,
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  jsonLd,
  seoDescription,
  seoTitle,
  slugify,
  truncate,
} from '../index';

// Intl puts no-break and narrow no-break spaces in some locales and ICU versions.
const plain = (s: string) => s.replace(/\s/g, ' ');

describe('formatMoney', () => {
  it('formats USD by default', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  it('formats a negative amount', () => {
    expect(formatMoney(-5)).toBe('-$5.00');
  });

  it('divides minor units by the currency digits', () => {
    expect(formatMoney(1999, 'USD', { minor: true })).toBe('$19.99');
    expect(formatMoney(500, 'JPY', { minor: true })).toBe('¥500');
    expect(plain(formatMoney(1500, 'KWD', { minor: true }))).toBe('KWD 1.500');
  });

  it('compacts large amounts', () => {
    expect(formatMoney(1234, 'USD', { compact: true })).toBe('$1.2K');
  });

  it('follows the locale', () => {
    expect(plain(formatMoney(1234.5, 'EUR', { locale: 'de-DE' }))).toBe('1.234,50 €');
    expect(plain(formatMoney(150000, 'VND', { locale: 'vi-VN' }))).toBe('150.000 ₫');
  });

  it('returns an empty string for a value that is not a number', () => {
    expect(formatMoney(NaN)).toBe('');
    expect(formatMoney(Infinity, 'USD', { minor: true })).toBe('');
  });

  it('throws on an invalid currency code', () => {
    expect(() => formatMoney(1, 'DOLLARS')).toThrow(RangeError);
  });
});

describe('formatNumber, formatCompact, formatPercent', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567.891)).toBe('1,234,567.891');
    expect(formatNumber(1234.5678, { maximumFractionDigits: 1 })).toBe('1,234.6');
    expect(formatNumber(1234567, { locale: 'de-DE' })).toBe('1.234.567');
  });

  it('shortens big numbers', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1234)).toBe('1.2K');
    expect(formatCompact(2_500_000)).toBe('2.5M');
  });

  it('takes a ratio for percent', () => {
    expect(formatPercent(0.753)).toBe('75%');
    expect(formatPercent(0.753, { maximumFractionDigits: 1 })).toBe('75.3%');
    expect(formatPercent(1)).toBe('100%');
  });

  it('returns an empty string for a value that is not a number', () => {
    expect(formatNumber(NaN)).toBe('');
    expect(formatCompact(Infinity)).toBe('');
    expect(formatPercent(NaN)).toBe('');
  });
});

describe('formatDate', () => {
  it('prints the UTC day by default', () => {
    expect(formatDate('2026-10-13T23:30:00Z')).toBe('Oct 13, 2026');
    expect(formatDate(Date.UTC(2026, 9, 13))).toBe('Oct 13, 2026');
    expect(formatDate(new Date('2026-10-13T00:00:00Z'))).toBe('Oct 13, 2026');
  });

  it('honours the style and time zone', () => {
    expect(formatDate('2026-10-13T23:30:00Z', { style: 'long' })).toBe('October 13, 2026');
    expect(formatDate('2026-10-13T23:30:00Z', { timeZone: 'Asia/Ho_Chi_Minh' })).toBe('Oct 14, 2026');
  });

  it('adds the time of day on request', () => {
    expect(plain(formatDate('2026-10-13T23:30:00Z', { time: true }))).toContain('11:30 PM');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatDate('not a date')).toBe('');
  });
});

describe('formatRelativeTime', () => {
  const now = Date.UTC(2026, 9, 13, 12, 0, 0);
  const ago = (seconds: number) => formatRelativeTime(now - seconds * 1000, { now });

  it('says now inside the first minute', () => {
    expect(ago(30)).toBe('now');
    expect(ago(0)).toBe('now');
  });

  it('picks the largest unit that fits, rounding toward zero', () => {
    expect(ago(120)).toBe('2 minutes ago');
    expect(ago(90 * 60)).toBe('1 hour ago');
    expect(ago(86_400)).toBe('yesterday');
    expect(ago(3 * 86_400)).toBe('3 days ago');
    expect(ago(14 * 86_400)).toBe('2 weeks ago');
    expect(ago(60 * 86_400)).toBe('last month');
    expect(ago(70 * 86_400)).toBe('2 months ago');
    expect(ago(365 * 86_400)).toBe('last year');
    expect(ago(800 * 86_400)).toBe('2 years ago');
  });

  it('handles the future', () => {
    expect(formatRelativeTime(now + 2 * 3600 * 1000, { now })).toBe('in 2 hours');
    expect(formatRelativeTime(now + 86_400 * 1000, { now })).toBe('tomorrow');
  });

  it('accepts an ISO string and a locale', () => {
    expect(formatRelativeTime('2026-10-10T12:00:00Z', { now })).toBe('3 days ago');
    expect(formatRelativeTime('2026-10-10T12:00:00Z', { now, locale: 'es' })).toBe('hace 3 días');
  });

  it('uses the clock when `now` is left out', () => {
    expect(formatRelativeTime(Date.now() - 3 * 3600 * 1000)).toBe('3 hours ago');
  });

  it('returns an empty string for an invalid date', () => {
    expect(formatRelativeTime('nope', { now })).toBe('');
  });
});

describe('formatDuration', () => {
  it('reads like a clock', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(5)).toBe('0:05');
    expect(formatDuration(75)).toBe('1:15');
    expect(formatDuration(3599)).toBe('59:59');
    expect(formatDuration(3725)).toBe('1:02:05');
  });

  it('drops fractions and clamps a negative value', () => {
    expect(formatDuration(74.9)).toBe('1:14');
    expect(formatDuration(-3)).toBe('0:00');
  });

  it('returns an empty string for a value that is not a number', () => {
    expect(formatDuration(NaN)).toBe('');
  });
});

describe('truncate', () => {
  it('leaves short text alone and collapses whitespace', () => {
    expect(truncate('short text', 20)).toBe('short text');
    expect(truncate('hello', 5)).toBe('hello');
    expect(truncate('  a \n\t b  ', 20)).toBe('a b');
  });

  it('cuts on a word boundary, never over max', () => {
    expect(truncate('hello brave new world', 14)).toBe('hello brave…');
    expect(truncate('hello brave new world', 14).length).toBeLessThanOrEqual(14);
  });

  it('keeps whole words when the cut lands between them', () => {
    expect(truncate('hello world foo', 12)).toBe('hello world…');
  });

  it('hard-cuts a single long word', () => {
    expect(truncate('supercalifragilistic', 8)).toBe('superca…');
  });

  it('never splits an emoji', () => {
    expect(truncate('😀😀😀😀😀', 3)).toBe('😀😀…');
  });

  it('gives an empty string when nothing fits', () => {
    expect(truncate('hello', 0)).toBe('');
    expect(truncate('hello', 1)).toBe('…');
  });
});

describe('seoTitle', () => {
  it('appends the site name', () => {
    expect(seoTitle('Science quiz', 'Quick Quiz')).toBe('Science quiz | Quick Quiz');
  });

  it('shortens the page title, not the site name', () => {
    const title = seoTitle('A very long page title that will not fit in sixty characters at all', 'Quick Quiz');
    expect(title.endsWith('… | Quick Quiz')).toBe(true);
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('works without a site name', () => {
    expect(seoTitle('Science quiz')).toBe('Science quiz');
  });

  it('drops a site name that exactly fills the limit', () => {
    expect(seoTitle('Science quiz', 'abcdefg', 10)).toBe('Science…');
  });

  it('drops a site name that alone fills the limit', () => {
    expect(seoTitle('Science quiz', 'A site with a long name', 10)).toBe('Science…');
  });
});

describe('seoDescription', () => {
  it('strips tags and collapses whitespace', () => {
    expect(seoDescription('<p>Play  <b>trivia</b>\nnow</p>')).toBe('Play trivia now');
  });

  it('cuts to 160 characters by default', () => {
    expect(seoDescription('word '.repeat(100)).length).toBeLessThanOrEqual(160);
  });
});

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Hello, World! 2026')).toBe('hello-world-2026');
  });

  it('folds accents, including Vietnamese đ', () => {
    expect(slugify('Café Crème')).toBe('cafe-creme');
    expect(slugify('Đố vui: Khoa học!')).toBe('do-vui-khoa-hoc');
  });

  it('trims dashes and respects max', () => {
    expect(slugify('--- a ---')).toBe('a');
    expect(slugify('one two three', 8)).toBe('one-two');
  });

  it('gives an empty string when no letter survives', () => {
    expect(slugify('日本語')).toBe('');
  });
});

describe('canonicalUrl', () => {
  const base = 'https://quickquiz.app';

  it('builds the origin plus path', () => {
    expect(canonicalUrl(base, '/q/abc')).toBe('https://quickquiz.app/q/abc');
    expect(canonicalUrl(base)).toBe('https://quickquiz.app/');
  });

  it('drops query, hash and trailing slash', () => {
    expect(canonicalUrl(base, '/topics/science/?page=2#top')).toBe('https://quickquiz.app/topics/science');
    expect(canonicalUrl(base, '/')).toBe('https://quickquiz.app/');
  });

  it('ignores a path on the base and a trailing slash on it', () => {
    expect(canonicalUrl('https://quickquiz.app/', '/search')).toBe('https://quickquiz.app/search');
  });

  it('refuses a path that leaves the origin', () => {
    expect(() => canonicalUrl(base, '//evil.com/x')).toThrow(RangeError);
    expect(() => canonicalUrl(base, 'https://evil.com/x')).toThrow(RangeError);
    expect(() => canonicalUrl(base, 'javascript:alert(1)')).toThrow(RangeError);
  });
});

describe('jsonLd', () => {
  it('serialises and escapes "<" so the script tag cannot be closed', () => {
    const out = jsonLd({ name: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>' });
  });
});
