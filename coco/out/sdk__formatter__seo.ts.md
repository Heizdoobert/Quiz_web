# sdk/formatter/seo.ts
lines:56 exports:truncate,seoTitle,seoDescription,slugify,canonicalUrl,jsonLd
---
/**
 * Cuts `text` to at most `max` characters, on a word boundary, and ends it with "…".
 * Whitespace is collapsed first. Counts code points, so an emoji is never split.
 */
export function truncate(text: string, max: number): string {
  const chars = [...text.replace(/\s+/g, ' ').trim()];
  if (chars.length <= max) return chars.join('');
  if (max < 1) return '';
  const cut = chars.slice(0, max - 1);
  // The cut is clean when the next character is a space; otherwise back off to the last space.
  const lastSpace = cut.lastIndexOf(' ');
  const kept = chars[max - 1] === ' ' || lastSpace < 1 ? cut : cut.slice(0, lastSpace);
  return `${kept.join('').trimEnd()}…`;
}

/** `<title>` text: "Science quiz | Quick Quiz", the page title shortened so the whole thing fits `max`. */
export function seoTitle(title: string, siteName?: string, max = 60): string {
  const suffix = siteName ? ` | ${siteName}` : '';
  return suffix.length < max ? truncate(title, max - suffix.length) + suffix : truncate(title, max);
}

/** Meta description: tags stripped, whitespace collapsed, cut to `max` (Google shows about 160). */
export function seoDescription(text: string, max = 160): string {
  return truncate(text.replace(/<[^>]*>/g, ' '), max);
}

/**
 * URL slug: "Đố vui: Khoa học!" -> "do-vui-khoa-hoc". Accents are folded to ASCII.
 * Letters with no ASCII form (ß, ø, other scripts) are dropped, so the result can be '': fall back to an id.
 */
export function slugify(text: string, max = 80): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd') // no decomposition, so NFKD leaves it
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, max)
    .replace(/^-+|-+$/g, '');
}
