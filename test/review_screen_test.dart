// Widget tests for the ReviewScreen flow.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/quiz/review_screen.dart';
import 'package:mobile/features/quiz/quiz_screen.dart';
import 'package:mobile/features/quiz/quiz_provider.dart' as qp;
import 'package:flutter_riverpod/flutter_riverpod.dart' show AsyncValue;

// A simple fake notifier that provides pre‑filled questions and answers.
class FakeQuizNotifier extends Notifier<qp.QuizState> {
  bool finalizeCalled = false;

  @override
  qp.QuizState build() {
    final questions = [
      {
        'id': 'q1',
        'question': 'What is 2+2?',
        'options': ['1', '2', '3', '4'],
        'category': 'Math',
        'created_by': ''
      },
      {
        'id': 'q2',
        'question': 'Capital of France?',
        'options': ['Paris', 'Berlin', 'Rome', 'Madrid'],
        'category': 'Geography',
        'created_by': ''
      },
    ];
    // Simulate that both questions have been answered.
    final answers = {'q1': 3, 'q2': 0};
    return qp.QuizState(
      questions: AsyncValue.data(questions),
      answers: answers,
    );
  }

  @override
  Future<void> finalizeQuiz() async {
    finalizeCalled = true;
  }
}

void main() {
  testWidgets('ReviewScreen shows answered questions and edit navigation', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [qp.quizProvider.overrideWith((ref) => FakeQuizNotifier())],
        child: const MaterialApp(home: ReviewScreen()),
      ),
    );
    await tester.pumpAndSettle();

    // Verify both question titles appear.
    expect(find.text('What is 2+2?'), findsOneWidget);
    expect(find.text('Capital of France?'), findsOneWidget);

    // Tap the first Edit button.
    final editButtons = find.widgetWithText(TextButton, 'Edit');
    expect(editButtons, findsNWidgets(2));
    await tester.tap(editButtons.first);
    await tester.pumpAndSettle();

    // A QuizScreen should be present with the correct initialQuestionId.
    final quizScreenFinder = find.byType(QuizScreen);
    expect(quizScreenFinder, findsOneWidget);
    final quizScreen = tester.widget<QuizScreen>(quizScreenFinder);
    expect(quizScreen.initialQuestionId, equals('q1'));
  });

  testWidgets('ReviewScreen submit finalizes quiz and shows snackbar', (WidgetTester tester) async {
    final fakeNotifier = FakeQuizNotifier();
    await tester.pumpWidget(
      ProviderScope(
        overrides: [qp.quizProvider.overrideWith((ref) => fakeNotifier)],
        child: const MaterialApp(home: ReviewScreen()),
      ),
    );
    await tester.pumpAndSettle();

    // Tap the Submit button.
    await tester.tap(find.widgetWithText(ElevatedButton, 'Submit'));
    await tester.pump(); // start snackbar animation
    await tester.pump(const Duration(seconds: 1)); // let it appear

    expect(fakeNotifier.finalizeCalled, isTrue);
    expect(find.text('Quiz submitted!'), findsOneWidget);
  });
}
