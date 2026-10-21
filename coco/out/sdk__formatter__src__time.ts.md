# sdk/formatter/src/time.ts
lines:68 exports:DateInput,DateOptions,formatDate,formatRelativeTime,formatDuration
---
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
