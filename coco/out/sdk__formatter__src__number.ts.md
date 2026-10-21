# sdk/formatter/src/number.ts
lines:21 exports:NumberOptions,formatNumber,formatCompact,formatPercent
---
import { DEFAULT_LOCALE, formatWithIntl } from './intl';

export interface NumberOptions {
  locale?: string;
  maximumFractionDigits?: number;
}

/** 1234567.891 -> "1,234,567.891". Returns '' for a non-finite value. */
export function formatNumber(value: number, { locale = DEFAULT_LOCALE, maximumFractionDigits }: NumberOptions = {}): string {
  return formatWithIntl(value, locale, { maximumFractionDigits });
}

/** 1234 -> "1.2K", 2500000 -> "2.5M". */
export function formatCompact(value: number, { locale = DEFAULT_LOCALE }: NumberOptions = {}): string {
  return formatWithIntl(value, locale, { notation: 'compact' });
}

/** Takes a ratio, not a percentage: 0.753 -> "75%", and with maximumFractionDigits 1 -> "75.3%". */
export function formatPercent(ratio: number, { locale = DEFAULT_LOCALE, maximumFractionDigits = 0 }: NumberOptions = {}): string {
  return formatWithIntl(ratio, locale, { style: 'percent', maximumFractionDigits });
}
