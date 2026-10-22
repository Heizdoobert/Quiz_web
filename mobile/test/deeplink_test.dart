import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/main.dart';
import 'package:mobile/features/quiz/quiz_screen.dart';
import 'package:mobile/features/leaderboard/leaderboard_screen.dart';
import 'package:mobile/features/groups/challenge_group_screen.dart';
import 'package:mobile/features/auth/auth_screen.dart';

void main() {
  testWidgets('QuickQuizApp routes quickquiz://quiz to QuizScreen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: QuickQuizApp(initialRoute: 'quickquiz://quiz'),
      ),
    );
    await tester.pump();

    expect(find.byType(QuizScreen), findsOneWidget);
  });

  testWidgets('QuickQuizApp routes quickquiz://leaderboard to LeaderboardScreen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: QuickQuizApp(initialRoute: 'quickquiz://leaderboard'),
      ),
    );
    await tester.pump();

    expect(find.byType(LeaderboardScreen), findsOneWidget);
  });

  testWidgets('QuickQuizApp routes quickquiz://challenge-groups to ChallengeGroupScreen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: QuickQuizApp(initialRoute: 'quickquiz://challenge-groups'),
      ),
    );
    await tester.pump();

    expect(find.byType(ChallengeGroupScreen), findsOneWidget);
  });

  testWidgets('QuickQuizApp routes unknown path to AuthScreen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: QuickQuizApp(initialRoute: '/unknown_route'),
      ),
    );
    await tester.pump();

    expect(find.byType(AuthScreen), findsOneWidget);
  });
}
