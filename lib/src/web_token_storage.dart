import 'dart:convert';
import 'dart:html';

import 'models.dart';
import 'token_storage.dart';

/// Web implementation of [TokenStorage] using `window.localStorage`.
class WebTokenStorage extends TokenStorage {
  static const _key = 'auth_sdk_tokens';

  @override
  Future<void> writeTokens(TokenBundle tokens) async {
    final data = jsonEncode({
      'accessToken': tokens.accessToken,
      'refreshToken': tokens.refreshToken,
      'expiresAt': tokens.expiresAt.toIso8601String(),
    });
    window.localStorage[_key] = data;
  }

  @override
  Future<TokenBundle?> readTokens() async {
    final data = window.localStorage[_key];
    if (data == null) return null;
    try {
      final Map<String, dynamic> json = jsonDecode(data);
      return TokenBundle(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
      );
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> clear() async {
    window.localStorage.remove(_key);
  }
}
