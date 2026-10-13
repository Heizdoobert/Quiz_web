import { DEFAULT_LOCALE } from './intl';

export type DateInput = Date | string | number;

export interface DateOptions {
  locale?: string;
  /** UTC unless told otherwise, so a server and a browser in different zones print the same day. */
  timeZone?: string;
  style?: 'short' | 'medium' | 'long' | 'full';
  /** Adds the time of day: "Oct 13, 2026, 11:30 PM". */
  time?: boolean;
}

function toDate(input: DateInput): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Oct 13, 2026". Returns '' for an invalid date. */
export function formatDate(
  input: DateInput,
  { locale = DEFAULT_LOCALE, timeZone = 'UTC', style = 'medium', time = false }: DateOptions = {},
): string {
  const date = toDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat(locale, { dateStyle: style, timeStyle: time ? 'short' : undefined, timeZone }).format(date);
}

// Month and year are averages (30.4375 and 365 days), the same rough sizes any "3 months ago" uses.
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_629_800],
  ['week', 604_800],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/**
 * "3 days ago", "yesterday", "in 2 hours", "now". `now` is for tests.
 * Rounds toward zero: 90 minutes ago is "1 hour ago". Returns '' for an invalid date.
 */
export function formatRelativeTime(
  input: DateInput,
  { locale = DEFAULT_LOCALE, now = Date.now() }: { locale?: string; now?: number } = {},
): string {
  const date = toDate(input);
  if (!date) return '';
  const seconds = Math.round((date.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.trunc(seconds / size), unit);
  }
  return rtf.format(0, 'second');
}

/**
 * A clock reading for a quiz timer, from seconds: 75 -> "1:15", 3725 -> "1:02:05".
 * Fractions are dropped and a negative value reads "0:00". Returns '' for a non-finite value.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return '';
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(total % 60)}` : `${minutes}:${pad(total % 60)}`;
}
