// lib/auth_sdk.dart

library auth_sdk;

import 'dart:async';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'src/models.dart';
import 'src/token_storage.dart';
import 'src/auth_flow.dart';
import 'src/refresh.dart';
import 'src/sign_out.dart';

/// Public entry point for the Authentication SDK.
class AuthSdk {
  static final AuthSdk _instance = AuthSdk._internal();
  factory AuthSdk() => _instance;
  AuthSdk._internal();

  // ---------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------
  late final List<AuthProviderConfig> _providers;
  late final TokenStorage _storage;
  UserSession? _currentSession;
  bool _initialized = false;

  /// Initialize the SDK with provider configs and storage implementation.
  /// Must be called before any other SDK method.
  static Future<void> initialize({
    required List<AuthProviderConfig> providers,
    required TokenStorage storage,
  }) async {
    final sdk = AuthSdk();
    if (sdk._initialized) {
      throw const AuthException('already_initialized', 'AuthSdk has already been initialized.');
    }
    if (providers.isEmpty) {
      throw const AuthException('provider_misconfiguration', 'At least one provider must be configured.');
    }
    sdk._providers = providers;
    sdk._storage = storage;
    // Attempt to restore any persisted session.
    final stored = await storage.readTokens();
    if (stored != null) {
      // In a real implementation we would need to know which provider created the token.
      // For simplicity we pick the first provider here.
      sdk._currentSession = UserSession(
        providerId: providers.first.id,
        userId: '', // userId would normally be extracted from the ID token.
        tokens: stored,
      );
    }
    sdk._initialized = true;
  }

  /// Returns the currently signed‑in session, or null if none.
  static UserSession? get currentSession => AuthSdk()._currentSession;

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------
  /// Starts the sign‑in flow for the given provider identifier.
  static Future<UserSession> signIn({required String providerId}) async {
    final sdk = AuthSdk();
    _ensureInitialized(sdk);
    final provider = sdk._providers.firstWhere(
      (p) => p.id == providerId,
      orElse: () => throw const AuthException('provider_not_found', 'Requested provider not configured.'),
    );
    final session = await _signInFlow(provider, sdk._storage);
    sdk._currentSession = session;
    return session;
  }

  /// Refreshes the access token using the stored refresh token.
  static Future<void> refreshToken() async {
    final sdk = AuthSdk();
    _ensureInitialized(sdk);
    if (sdk._currentSession == null) {
      throw const AuthException('no_session', 'Cannot refresh when no user is signed in.');
    }
    final refreshed = await _refreshTokens(sdk._currentSession!.tokens, sdk._storage);
    sdk._currentSession = UserSession(
      providerId: sdk._currentSession!.providerId,
      userId: sdk._currentSession!.userId,
      tokens: refreshed,
    );
  }

  /// Signs out the current user and clears stored tokens.
  static Future<void> signOut() async {
    final sdk = AuthSdk();
    _ensureInitialized(sdk);
    await _signOut(sdk._storage);
    sdk._currentSession = null;
  }

  // ---------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------
  static void _ensureInitialized(AuthSdk sdk) {
    if (!sdk._initialized) {
      throw const AuthException('not_initialized', 'AuthSdk.initialize must be called before using the SDK.');
    }
  }
}
