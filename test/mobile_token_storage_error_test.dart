import 'dart:io';
import 'package:test/test.dart';

import 'package:auth_sdk/src/token_storage.dart';
import 'package:auth_sdk/src/models.dart';

void main() {
  group('MobileTokenStorage error handling', () {
    final storage = MobileTokenStorage();
    final filePath = '${Directory.systemTemp.path}${Platform.pathSeparator}auth_sdk_tokens.json';
    final file = File(filePath);

    tearDown(() async {
      // Ensure cleanup after each test.
      if (await file.exists()) {
        await file.delete();
      }
    });

    test('returns null on corrupted JSON', () async {
      // Write invalid JSON directly.
      await file.writeAsString('{invalid');
      final result = await storage.readTokens();
      expect(result, isNull);
    });

    test('clear works when file absent', () async {
      // Ensure file does not exist.
      if (await file.exists()) await file.delete();
      await storage.clear(); // Should not throw.
      expect(await file.exists(), isFalse);
    });
  });
}
