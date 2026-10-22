import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/main/main_screen.dart';
import 'package:mobile/features/quiz/create_quiz_screen.dart';
import 'package:mobile/services/tier/tier_provider.dart';
import 'package:mobile/services/tier/session_quiz_store.dart';
import 'package:mobile/db/quiz_repository.dart';

class MockQuizRepo extends QuizRepository {
  List<Map<String, dynamic>> saved = [];

  @override
  Future<void> saveQuizList({
    required String name,
    required List<Map<String, dynamic>> questions,
  }) async {
    saved.add({'name': name, 'questions': questions});
  }

  @override
  Future<List<Map<String, dynamic>>> getCachedQuestions() async => [];

  @override
  Future<List<Map<String, dynamic>>> getQueuedAnswers() async => [];
}

void main() {
  testWidgets('MainScreen displays FloatingActionButton to Create Quiz on home tab', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: MainScreen()),
      ),
    );
    await tester.pump();

    expect(find.byType(FloatingActionButton), findsOneWidget);
    expect(find.text('Create Quiz'), findsOneWidget);
  });

  testWidgets('CreateQuizScreen for Guest shows 20-quiz limit and locked custom topic', (WidgetTester tester) async {
    final sessionStore = SessionQuizStore();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
          sessionQuizStoreProvider.overrideWithValue(sessionStore),
        ],
        child: const MaterialApp(home: CreateQuizScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create Quiz'), findsOneWidget);
    expect(find.text('Guest Session'), findsOneWidget);
    expect(find.text('Quizzes: 0 / 20 in session'), findsOneWidget);
    expect(find.text('Custom topic locked'), findsOneWidget);
    expect(find.text('+ Custom Topic'), findsNothing);
  });

  testWidgets('CreateQuizScreen for Authenticated User allows creating custom topics', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: true)),
        ],
        child: const MaterialApp(home: CreateQuizScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('+ Custom Topic'), findsOneWidget);
    expect(find.text('Custom topic locked'), findsNothing);

    // Tap + Custom Topic
    await tester.tap(find.text('+ Custom Topic'));
    await tester.pumpAndSettle();

    expect(find.widgetWithText(TextFormField, 'Enter new topic name...'), findsOneWidget);
  });

  testWidgets('Guest creating question adds to session store and shows session toast', (WidgetTester tester) async {
    final sessionStore = SessionQuizStore();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
          sessionQuizStoreProvider.overrideWithValue(sessionStore),
        ],
        child: const MaterialApp(home: CreateQuizScreen()),
      ),
    );
    await tester.pumpAndSettle();

    // Fill in question prompt
    await tester.enterText(
      find.widgetWithText(TextFormField, 'Enter your question here...'),
      'What is Bitcoin?',
    );

    // Fill in 4 options
    await tester.enterText(find.widgetWithText(TextFormField, 'Option A'), 'A currency');
    await tester.enterText(find.widgetWithText(TextFormField, 'Option B'), 'A car');
    await tester.enterText(find.widgetWithText(TextFormField, 'Option C'), 'A food');
    await tester.enterText(find.widgetWithText(TextFormField, 'Option D'), 'A city');

    // Scroll to and tap Add Quiz Question
    final submitButton = find.widgetWithText(ElevatedButton, 'Add Quiz Question');
    await tester.ensureVisible(submitButton);
    await tester.tap(submitButton);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(sessionStore.count, equals(1));
    expect(sessionStore.questions.first['prompt'], equals('What is Bitcoin?'));
    expect(find.text('Quiz added to session (Session only - not saved to disk).'), findsOneWidget);
  });
}
