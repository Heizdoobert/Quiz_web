import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import '../auth/auth_provider.dart';
import '../quiz/board_panels.dart';
import '../quiz/board_provider.dart';

/// A question the player wrote, as GET /profile/quizzes lists it.
class MyQuestion {
  const MyQuestion({required this.prompt, this.category, this.status});

  factory MyQuestion.fromJson(Map<String, dynamic> json) => MyQuestion(
        prompt: json['prompt'] as String,
        category: json['category'] as String?,
        status: json['status'] as String?,
      );

  final String prompt;
  final String? category;
  final String? status;
}

final myQuestionsProvider = FutureProvider.autoDispose<List<MyQuestion>>((ref) async {
  final response = await ref.watch(apiClientProvider).get('/profile/quizzes');
  return [for (final q in response['quizzes'] as List) MyQuestion.fromJson(q as Map<String, dynamic>)];
});

/// The web profile for a phone: the player's stats and the questions they wrote. Writing and
/// editing questions stays on the web.
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final board = ref.watch(boardProvider).value ?? const Board();
    final questions = ref.watch(myQuestionsProvider);
    // An expired session signs the player out; there is nothing left to show here.
    ref.listen(authProvider.select((a) => a.isAuthenticated), (_, signedIn) {
      if (!signedIn) Navigator.of(context).maybePop();
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), backgroundColor: AppColors.deepSpace),
      body: RefreshIndicator(
        color: AppColors.neoMint,
        onRefresh: () async {
          ref.invalidate(boardProvider);
          await ref.refresh(myQuestionsProvider.future).catchError((_) => <MyQuestion>[]);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            ScoreboardPanel(board: board),
            const SizedBox(height: 24),
            const Text('My questions', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            ...questions.when(
              loading: () => [const Center(child: CircularProgressIndicator(color: AppColors.neoMint))],
              error: (err, _) => [_Note('Could not load your questions.\n$err')],
              data: (qs) => qs.isEmpty
                  ? [const _Note('You have not written any questions yet. Write them on the web.')]
                  : [for (final q in qs) _QuestionTile(question: q)],
            ),
          ],
        ),
      ),
    );
  }
}

class _QuestionTile extends StatelessWidget {
  const _QuestionTile({required this.question});

  final MyQuestion question;

  @override
  Widget build(BuildContext context) {
    final details = [question.category, question.status].whereType<String>().join(' · ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: GlassCard(
        padding: const EdgeInsets.all(16),
        radius: 16,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(question.prompt, style: const TextStyle(fontSize: 15, height: 1.4)),
            if (details.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(details, style: const TextStyle(color: AppColors.slate400, fontSize: 12)),
            ],
          ],
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Text(text, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate400, height: 1.5)),
    );
  }
}
