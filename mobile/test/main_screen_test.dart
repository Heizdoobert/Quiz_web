import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/main/main_screen.dart';
import 'package:mobile/features/quiz/board_provider.dart';

void main() {
  testWidgets('MainScreen renders NavigationBar and switches tabs', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          boardProvider.overrideWithValue(const AsyncValue.data(Board())),
        ],
        child: const MaterialApp(
          home: MainScreen(initialIndex: 0),
        ),
      ),
    );
    await tester.pump();

    // Verify NavigationBar exists
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Quiz'), findsWidgets);
    expect(find.text('Leaderboard'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);

    // Tap on Settings tab (last destination)
    await tester.tap(find.text('Settings'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Account'), findsOneWidget);
  });
}
