# sdk/formatter/README.md
lines:32 exports:
---
# formatter

Pure formatting helpers for money, numbers, time and SEO text. No dependencies: everything is built on `Intl`, `URL` and plain string work, so it runs the same in Node and the browser.

```ts
import { formatMoney, formatRelativeTime, slugify, seoTitle } from '@/sdk/formatter';

formatMoney(1999, 'USD', { minor: true }); // "$19.99"
formatRelativeTime(createdAt);             // "3 days ago"
slugify('Đố vui: Khoa học!');              // "do-vui-khoa-hoc"
seoTitle('Science quiz', 'Quick Quiz');    // "Science quiz | Quick Quiz"
```

| File | Functions |
|------|-----------|
| `money.ts` | `formatMoney(amount, currency?, { locale, minor, compact })` |
| `number.ts` | `formatNumber`, `formatCompact`, `formatPercent` (takes a ratio: `0.75` is "75%") |
| `time.ts` | `formatDate`, `formatRelativeTime`, `formatDuration` (seconds to "1:15") |
| `seo.ts` | `truncate`, `seoTitle`, `seoDescription`, `slugify`, `canonicalUrl`, `jsonLd` |

## Rules every function follows

- **Deterministic.** The locale defaults to `en-US` and dates print in UTC, never the runtime's own settings. A server and a browser in different zones give the same text, so hydration does not mismatch. Pass `locale` or `timeZone` to change it.
- **A bad value gives `''`**, not "NaN" or "Invalid Date": a non-finite number, an unparseable date. A bad option (an unknown currency code or locale) throws `RangeError` from `Intl`, because that is a bug in the caller.
- **No state, no cache.** Each call builds its `Intl` formatter. Add a small cache in `intl.ts` if a profiler shows a long list spending time there.

## Notes

- `canonicalUrl` throws when the path leaves the origin (`//evil.com`, `https://evil.com`), so a request-derived path can never point search engines elsewhere.
- `jsonLd` escapes `<`; use it for every `<script type="application/ld+json">` instead of repeating `JSON.stringify(x).replace(/</g, '\\u003c')`.
- `slugify` keeps ASCII only. Letters with no ASCII form (`ß`, `ø`, CJK) are dropped, so the result can be `''`: fall back to the id.
- `formatRelativeTime` rounds toward zero, so 60 days ago is "last month". `lib/utils/format.ts` has an older English-only `formatRelativeTime`; the app has not moved to this one yet.
