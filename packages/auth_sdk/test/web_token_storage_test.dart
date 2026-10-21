// This test runs only on Chrome (web platform).
@TestOn('chrome')
import 'dart:html';
import 'package:test/test.dart';
import 'package:auth_sdk/src/storage/web_token_storage.dart';
import 'package:auth_sdk/src/models/models.dart';

void main() {
  group('WebTokenStorage', () {
    final storage = WebTokenStorage();
    const key = 'auth_sdk_tokens';

    tearDown(() async {
      // Clean up after each test.
      window.localStorage.remove(key);
    });

    test('writes and reads tokens', () async {
      final token = TokenBundle(
        accessToken: 'webAccess',
        refreshToken: 'webRefresh',
        expiresAt: DateTime.now().add(const Duration(hours: 1)),
      );
      await storage.writeTokens(token);
      final loaded = await storage.readTokens();
      expect(loaded, isNotNull);
      expect(loaded!.accessToken, token.accessToken);
      expect(loaded.refreshToken, token.refreshToken);
      expect(loaded.expiresAt.isAtSameMomentAs(token.expiresAt), isTrue);
    });

    test('clear removes stored tokens', () async {
      await storage.writeTokens(TokenBundle(
        accessToken: 'a',
        refreshToken: 'r',
        expiresAt: DateTime.now(),
      ));
      await storage.clear();
      expect(window.localStorage.containsKey(key), isFalse);
    });
  });
}
