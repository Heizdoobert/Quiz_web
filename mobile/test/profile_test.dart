import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/profile/profile_screen.dart';
import 'package:mobile/features/quiz/board_provider.dart';
import 'package:mobile/theme/app_theme.dart';

Widget _profile(List<MyQuestion> questions) => ProviderScope(
      overrides: [
        myQuestionsProvider.overrideWith((ref) async => questions),
        boardProvider.overrideWith((ref) async => const Board(score: 7)),
      ],
      child: MaterialApp(theme: buildAppTheme(), home: const ProfileScreen()),
    );

void main() {
  test('a question from GET /profile/quizzes parses with or without its details', () {
    final full = MyQuestion.fromJson({'prompt': 'Why?', 'category': 'Science', 'status': 'approved', 'options': ['a']});
    expect([full.prompt, full.category, full.status], ['Why?', 'Science', 'approved']);

    final bare = MyQuestion.fromJson({'prompt': 'How?'});
    expect([bare.category, bare.status], [null, null]);
  });

  testWidgets('lists the questions the player wrote', (tester) async {
    await tester.pumpWidget(_profile(const [MyQuestion(prompt: 'Why is the sky blue?', category: 'Science', status: 'approved')]));
    await tester.pumpAndSettle();

    expect(find.text('Why is the sky blue?'), findsOneWidget);
    expect(find.text('Science · approved'), findsOneWidget);
  });

  testWidgets('says where to write questions when there are none', (tester) async {
    await tester.pumpWidget(_profile(const []));
    await tester.pumpAndSettle();

    expect(find.textContaining('Write them on the web'), findsOneWidget);
  });
}
