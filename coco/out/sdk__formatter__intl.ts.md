# sdk/formatter/intl.ts
lines:8 exports:DEFAULT_LOCALE,formatWithIntl
---
// en-US, not the runtime default: a server and a browser with different defaults would render
// different text for the same value and break hydration.
export const DEFAULT_LOCALE = 'en-US';

// '' for NaN and Infinity, so a missing value shows nothing instead of "NaN".
export function formatWithIntl(value: number, locale: string, options: Intl.NumberFormatOptions): string {
  return Number.isFinite(value) ? new Intl.NumberFormat(locale, options).format(value) : '';
}
