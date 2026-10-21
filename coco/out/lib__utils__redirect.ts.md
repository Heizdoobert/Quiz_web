# lib/utils/redirect.ts
lines:29 exports:sanitizeRedirectUrl
---
/**
 * Safe redirect sanitizer per OWASP open-redirect prevention guidelines.
 * Rejects protocol-relative URLs (//, /\) and absolute URIs (http:, https:, javascript:),
 * allowing only internal relative paths starting with a single '/'.
 */
export function sanitizeRedirectUrl(
  redirectParam: string | null | undefined,
  fallback = '/profile'
): string {
  if (!redirectParam) return fallback;
  const trimmed = redirectParam.trim();
  if (!trimmed) return fallback;

  // Block protocol-relative (//evil.com, /\evil.com) and URI schemes (https:, javascript:, data:, etc.)
  if (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return fallback;
  }

  // Must be an internal relative path starting with /
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  return fallback;
}
