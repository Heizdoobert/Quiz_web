# mobile/MIGRATION_NOTES.md
lines:22 exports:
---
# Migration Note: Legacy Token Handling

## Background
The mobile app originally stored an authentication token under the key `auth_token` in secure storage. This was a legacy approach used before the current unified token management system (`secure_token`).

## Current State
- The app now attempts to read `secure_token` first.
- If `secure_token` is missing, it falls back to reading `auth_token` to maintain backward compatibility with older installations.
- This fallback is documented in `lib/api/api_client.dart`.

## Migration Plan
1. **Deprecation Timeline**: The legacy `auth_token` fallback will be removed in the next major version (e.g., `mobile-v2.0.0`).
2. **User Impact**: Users upgrading from versions prior to `mobile-v1.5.0` will retain access to their existing sessions until they re‑authenticate, after which only `secure_token` will be used.
3. **Cleanup**: After the deprecation release, the fallback logic and any related comments will be removed, and the secure storage will contain only `secure_token`.

## Action Required
- No immediate action is needed for current builds.
- Ensure that any new authentication flows store the token using the `secure_token` key.
- Monitor analytics for any unexpected token read failures after the deprecation release.

---
*This note is intended to guide developers and reviewers about the legacy token handling and its eventual removal.*
