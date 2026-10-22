import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/db/quiz_repository.dart';
import 'package:mobile/features/auth/auth_provider.dart';
import 'package:mobile/widgets/save_quiz_dialog.dart';

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
  Future<List<Map<String, dynamic>>> getSavedQuizLists() async => saved;
}

class TestAuthNotifier extends AuthNotifier {
  TestAuthNotifier({bool isAuthenticated = true})
      : super(ApiClient(), QuizRepository()) {
    state = AuthState(isAuthenticated: isAuthenticated);
  }
}

void main() {
  final sampleQuestions = [
    {'id': 'q1', 'prompt': 'Sample question 1', 'options': ['A', 'B', 'C', 'D']}
  ];

  testWidgets('promptSaveQuizDialog displays 2 options: Save and Don\'t Save', (WidgetTester tester) async {
    final repo = MockQuizRepo();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          quizRepositoryProvider.overrideWithValue(repo),
          authProvider.overrideWith((ref) => TestAuthNotifier(isAuthenticated: true)),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) => ElevatedButton(
                onPressed: () => promptSaveQuizDialog(context, ref, questions: sampleQuestions),
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      ),
    );

    // Tap to open dialog
    await tester.tap(find.text('Open Dialog'));
    await tester.pumpAndSettle();

    // Verify dialog contents and both options
    expect(find.text('Save Quiz List?'), findsOneWidget);
    expect(find.text('Do you want to save this quiz list so you can reload and reuse it later?'), findsOneWidget);
    expect(find.text("Don't Save"), findsOneWidget);
    expect(find.text('Save'), findsOneWidget);

    // Tap "Don't Save"
    await tester.tap(find.text("Don't Save"));
    await tester.pumpAndSettle();

    // Verify dialog dismissed and nothing saved
    expect(find.text('Save Quiz List?'), findsNothing);
    expect(repo.saved, isEmpty);
  });

  testWidgets('promptSaveQuizDialog saves quiz list when user taps Save', (WidgetTester tester) async {
    final repo = MockQuizRepo();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          quizRepositoryProvider.overrideWithValue(repo),
          authProvider.overrideWith((ref) => TestAuthNotifier(isAuthenticated: true)),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) => ElevatedButton(
                onPressed: () => promptSaveQuizDialog(
                  context,
                  ref,
                  questions: sampleQuestions,
                  defaultName: 'My Reusable Quiz',
                ),
                child: const Text('Open Dialog'),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('Open Dialog'));
    await tester.pumpAndSettle();

    // Tap "Save"
    await tester.tap(find.text('Save'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // Verify quiz was saved in repo
    expect(repo.saved.length, equals(1));
    expect(repo.saved.first['name'], equals('My Reusable Quiz'));
    expect(find.text('Quiz list saved for reuse!'), findsOneWidget);
  });
}
