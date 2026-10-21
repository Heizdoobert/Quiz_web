# sdk/formatter/src/money.ts
lines:25 exports:MoneyOptions,formatMoney
---
import { DEFAULT_LOCALE, formatWithIntl } from './intl';

export interface MoneyOptions {
  locale?: string;
  /** `amount` is in minor units (cents). The divisor comes from the currency: 100 for USD, 1 for JPY, 1000 for KWD. */
  minor?: boolean;
  /** "$1.2K" instead of "$1,234". */
  compact?: boolean;
}

/**
 * Formats an amount of money: `formatMoney(1234.5)` is "$1,234.50".
 * Returns '' for a non-finite amount. A bad currency code or locale throws RangeError from Intl.
 */
export function formatMoney(
  amount: number,
  currency = 'USD',
  { locale = DEFAULT_LOCALE, minor = false, compact = false }: MoneyOptions = {},
): string {
  const base: Intl.NumberFormatOptions = { style: 'currency', currency };
  // Intl always sets maximumFractionDigits for a currency; the type calls it optional.
  const digits = minor ? new Intl.NumberFormat(locale, base).resolvedOptions().maximumFractionDigits ?? 2 : 0;
  const divisor = 10 ** digits;
  return formatWithIntl(amount / divisor, locale, compact ? { ...base, notation: 'compact' } : base);
}
