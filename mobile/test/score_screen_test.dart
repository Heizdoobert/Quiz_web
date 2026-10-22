import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/quiz/board_provider.dart';
import 'package:mobile/features/score/score_screen.dart';

void main() {
  testWidgets('ScoreScreen renders fallback stats from boardProvider', (WidgetTester tester) async {
    const testBoard = Board(
      score: 120,
      accuracy: 85,
      streak: 7,
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          boardProvider.overrideWithValue(const AsyncValue.data(testBoard)),
        ],
        child: const MaterialApp(
          home: ScoreScreen(),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('Quiz Completed!'), findsOneWidget);
    expect(find.text('120'), findsOneWidget);
    expect(find.text('85%'), findsOneWidget);
    expect(find.text('7 🔥'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Play Again'), findsOneWidget);
    expect(find.widgetWithText(OutlinedButton, 'Back to Home'), findsOneWidget);
  });

  testWidgets('ScoreScreen renders custom arguments when provided', (WidgetTester tester) async {
    const customArgs = ScoreArguments(
      score: 250,
      correctCount: 4,
      totalQuestions: 5,
      streak: 10,
    );

    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: ScoreScreen(arguments: customArgs),
        ),
      ),
    );
    await tester.pump();

    expect(find.text('250'), findsOneWidget);
    expect(find.text('80%'), findsOneWidget);
    expect(find.text('10 🔥'), findsOneWidget);
    expect(find.text('You answered 4 out of 5 questions correctly.'), findsOneWidget);
  });
}
