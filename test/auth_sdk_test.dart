import 'dart:io';
import 'package:test/test.dart';

import 'package:auth_s../features/auth/token_storage.dart';
import 'package:auth_s../features/auth/models.dart';

void main() {
  group('MobileTokenStorage', () {
    final storage = MobileTokenStorage();
    final token = TokenBundle(
      accessToken: 'access123',
      refreshToken: 'refresh123',
      expiresAt: DateTime.now().add(const Duration(hours: 1)),
    );

    test('writes and reads tokens', () async {
      await storage.writeTokens(token);
      final loaded = await storage.readTokens();
      expect(loaded, isNotNull);
      expect(loaded!.accessToken, token.accessToken);
      expect(loaded.refreshToken, token.refreshToken);
      // allow slight diff in expiration due to serialization
      expect(loaded.expiresAt.isAtSameMomentAs(token.expiresAt), isTrue);
    });

    test('clears tokens', () async {
      await storage.writeTokens(token);
      await storage.clear();
      final cleared = await storage.readTokens();
      expect(cleared, isNull);
    });
  });
}
