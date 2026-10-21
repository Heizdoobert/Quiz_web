/// Core model definitions for the Authentication SDK.
///
/// These classes are intentionally minimal and documented to aid
/// developers using the SDK.

library auth_sdk.models;

/// Configuration for a supported OAuth provider.
class AuthProviderConfig {
  /// Unique identifier for the provider (e.g., "google", "facebook").
  final String id;

  /// Client ID registered with the provider.
  final String clientId;

  /// Redirect URI that the provider will use after authentication.
  /// Must be a URI that works on both mobile (app‑link) and web.
  final String redirectUri;

  /// Scopes requested during the OAuth flow.
  final List<String> scopes;

  const AuthProviderConfig({
    required this.id,
    required this.clientId,
    required this.redirectUri,
    required this.scopes,
  });
}

/// Container for access and refresh tokens.
class TokenBundle {
  final String accessToken;
  final String refreshToken;
  final DateTime expiresAt;

  const TokenBundle({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresAt,
  });

  /// Convenience: is the access token currently expired?
  bool get isExpired => DateTime.now().isAfter(expiresAt);
}

/// Represents an authenticated user session.
class UserSession {
  final String providerId;
  final String userId;
  final TokenBundle tokens;

  const UserSession({
    required this.providerId,
    required this.userId,
    required this.tokens,
  });
}

/// SDK‑wide exception type with a machine‑readable `code`.
class AuthException implements Exception {
  final String code;
  final String message;

  const AuthException(this.code, this.message);

  @override
  String toString() => 'AuthException($code): $message';
}
