// test/auth_loading_screen_error_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/features/auth/auth_loading_screen.dart';
import 'package:mobile/repositories/auth_repository.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';

/// A fake repository that throws an exception during token validation.
class ThrowingAuthRepository extends AuthRepository {
  ThrowingAuthRepository() : super(ApiClient(), SecureStorageService());

  @override
  Future<bool> isTokenValid() async => throw Exception('Network error');

  @override
  Future<String?> readToken() async => null;

  @override
  Future<void> saveToken(String token) async {}

  @override
  Future<void> clearToken() async {}
}

void main() {
  testWidgets('navigates to AuthScreen when token validation throws', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(
          home: AuthLoadingScreen(
            repository: ThrowingAuthRepository(),
          ),
        ),
      ),
    );

    await tester.pump(const Duration(seconds: 2));
await tester.pumpAndSettle(const Duration(seconds: 5));

    // Assuming AuthScreen contains a visible widget with text 'Sign in'
    expect(find.text('Sign in'), findsOneWidget);
  });
}
