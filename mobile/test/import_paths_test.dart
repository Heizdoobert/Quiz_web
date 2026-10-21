// Test that essential widgets build without errors after import path fixes.
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/features/auth/auth_loading_screen.dart';
import 'package:mobile/features/auth/auth_screen.dart';

import 'package:mobile/features/profile/profile_screen.dart';
import 'package:mobile/features/quiz/quiz_provider.dart';
import 'package:mobile/features/quiz/quiz_screen.dart';
import 'package:mobile/features/quiz/review_screen.dart';
import 'package:mobile/widgets/glass_card.dart';
import 'package:mobile/widgets/legal_links.dart';

import 'package:mobile/repositories/auth_repository.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';

void main() {
  testWidgets('Essential widgets build without errors', (WidgetTester tester) async {
    // AuthLoadingScreen dependencies
    final repository = AuthRepository(ApiClient(), SecureStorageService());
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(home: AuthLoadingScreen(repository: repository)),
      ),
    );
    await tester.pump();

    // AuthScreen
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: AuthScreen()),
      ),
    );
    await tester.pump();

    // ProfileScreen
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: ProfileScreen()),
      ),
    );
    await tester.pump();

    // QuizScreen
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: QuizScreen()),
      ),
    );
    await tester.pump();

    // ReviewScreen
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: ReviewScreen()),
      ),
    );
    await tester.pump();

    // GlassCard widget
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: GlassCard(child: SizedBox())),
      ),
    );
    await tester.pump();

    // LegalLinks widget
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LegalLinks()),
      ),
    );
    await tester.pump();
  });
}
