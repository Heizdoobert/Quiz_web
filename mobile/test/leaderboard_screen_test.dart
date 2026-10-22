import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/quiz/board_provider.dart';
import 'package:mobile/features/leaderboard/leaderboard_screen.dart';

void main() {
  testWidgets('LeaderboardScreen renders top players and current user bar', (WidgetTester tester) async {
    const testBoard = Board(
      score: 150,
      streak: 5,
      accuracy: 90,
      leaderboard: [
        {
          'rank': 1,
          'user_id': 'user1',
          'display_name': 'Champion Player',
          'score': 990,
          'accuracy': 98,
        },
        {
          'rank': 2,
          'user_id': 'user2',
          'display_name': 'Runner Up',
          'score': 850,
          'accuracy': 92,
        },
      ],
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          boardProvider.overrideWithValue(const AsyncValue.data(testBoard)),
        ],
        child: const MaterialApp(
          home: LeaderboardScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Global Leaderboard'), findsOneWidget);
    expect(find.text('Champion Player'), findsOneWidget);
    expect(find.text('990 pts'), findsOneWidget);
    expect(find.text('Runner Up'), findsOneWidget);
    expect(find.text('850 pts'), findsOneWidget);

    // Current user bar
    expect(find.text('Your Score'), findsOneWidget);
    expect(find.text('150 pts'), findsOneWidget);
    expect(find.text('90%'), findsOneWidget);
    expect(find.text('5 🔥'), findsOneWidget);
  });

  testWidgets('LeaderboardScreen renders empty state when leaderboard is empty', (WidgetTester tester) async {
    const emptyBoard = Board(leaderboard: []);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          boardProvider.overrideWithValue(const AsyncValue.data(emptyBoard)),
        ],
        child: const MaterialApp(
          home: LeaderboardScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('No leaderboard data yet'), findsOneWidget);
  });
}
