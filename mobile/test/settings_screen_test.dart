import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/db/quiz_repository.dart';
import 'package:mobile/features/settings/settings_screen.dart';
import 'package:mobile/widgets/legal_links.dart';

class FakeQuizRepo extends QuizRepository {
  List<Map<String, dynamic>> queued = [
    {'questionId': 'q1', 'answerIndex': 0, 'timestamp': 1234567, 'client_uuid': 'u1'}
  ];

  @override
  Future<List<Map<String, dynamic>>> getQueuedAnswers() async => queued;

  @override
  Future<void> clearQueuedAnswers(List<int> ids) async {}

  @override
  Future<void> clearAllQueuedAnswers() async {}

  @override
  Future<void> queueAnswer(String questionId, int answerIndex) async {}

  @override
  Future<void> cacheQuestions(List<Map<String, dynamic>> questions) async {}

  @override
  Future<List<Map<String, dynamic>>> getCachedQuestions() async => [];
}

void main() {
  testWidgets('SettingsScreen displays account info, sync queue and legal links', (WidgetTester tester) async {
    final fakeRepo = FakeQuizRepo();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          quizRepositoryProvider.overrideWithValue(fakeRepo),
        ],
        child: const MaterialApp(
          home: SettingsScreen(),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));

    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Account'), findsOneWidget);
    expect(find.text('Sign Out'), findsOneWidget);
    expect(find.text('Data & Offline Storage'), findsOneWidget);
    expect(find.text('Sync Now'), findsOneWidget);
    expect(find.text('1'), findsOneWidget); // pending sync count
    expect(find.byType(LegalLinks), findsOneWidget);
  });
}
