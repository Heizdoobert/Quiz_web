import 'dart:convert';
import 'dart:io';

import 'models.dart';
import 'token_storage.dart';

/// Mobile implementation of [TokenStorage] using a JSON file in the system's temporary directory.
class MobileTokenStorage extends TokenStorage {
  /// Path to the token file. Using a file in the system temporary directory ensures
  /// write permissions even when the repository root is read‑only.
  final String _filePath = '${Directory.systemTemp.path}${Platform.pathSeparator}auth_sdk_tokens.json';

  @override
  Future<void> writeTokens(TokenBundle tokens) async {
    final file = File(_filePath);
    final data = jsonEncode({
      'accessToken': tokens.accessToken,
      'refreshToken': tokens.refreshToken,
      'expiresAt': tokens.expiresAt.toIso8601String(),
    });
    await file.writeAsString(data);
  }

  @override
  Future<TokenBundle?> readTokens() async {
    final file = File(_filePath);
    if (!await file.exists()) return null;
    try {
      final content = await file.readAsString();
      final Map<String, dynamic> json = jsonDecode(content);
      return TokenBundle(
        accessToken: json['accessToken'] as String,
        refreshToken: json['refreshToken'] as String,
        expiresAt: DateTime.parse(json['expiresAt'] as String),
      );
    } catch (_) {
      // If parsing fails, treat as no valid tokens.
      return null;
    }
  }

  @override
  Future<void> clear() async {
    final file = File(_filePath);
    if (await file.exists()) {
      await file.delete();
    }
  }
}
