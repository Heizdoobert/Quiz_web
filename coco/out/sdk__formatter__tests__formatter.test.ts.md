# sdk/formatter/tests/formatter.test.ts
lines:275 exports:
---
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
