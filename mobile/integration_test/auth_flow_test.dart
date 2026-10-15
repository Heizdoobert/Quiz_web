// integration_test/auth_flow_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mobile/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('App starts on QuizScreen when token is valid', (WidgetTester tester) async {
    // Mock a stored token.
    FlutterSecureStorage.setMockInitialValues({'auth_token': 'valid-token'});

    // Run the app.
    app.main();
    await tester.pumpAndSettle();

    // Expect QuizScreen (its title or a unique widget).
    expect(find.byType(MaterialApp), findsOneWidget); // simple sanity
    expect(find.text('Quiz'), findsOneWidget); // adjust if QuizScreen has a known text
  });

  testWidgets('App starts on AuthScreen when token is missing', (WidgetTester tester) async {
    // No token stored.
    FlutterSecureStorage.setMockInitialValues({});

    app.main();
    await tester.pumpAndSettle();

    // Expect AuthScreen (e.g., a widget with 'Sign in').
    expect(find.text('Sign in'), findsOneWidget);
  });
}
