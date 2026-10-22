import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/theme/app_theme.dart';
import 'package:mobile/widgets/glass_card.dart';
import '../../utils/responsive.dart';

import '../quiz/board_provider.dart';
import '../quiz/quiz_provider.dart';

class ScoreArguments {
  const ScoreArguments({
    this.score,
    this.correctCount,
    this.totalQuestions,
    this.streak,
  });

  final int? score;
  final int? correctCount;
  final int? totalQuestions;
  final int? streak;
}

class ScoreScreen extends ConsumerWidget {
  const ScoreScreen({
    super.key,
    this.arguments,
  });

  final ScoreArguments? arguments;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final boardAsync = ref.watch(boardProvider);
    final board = boardAsync.value ?? const Board();

    final score = arguments?.score ?? board.score;
    final streak = arguments?.streak ?? board.streak;
    final accuracy = arguments?.totalQuestions != null && arguments!.totalQuestions! > 0
        ? ((arguments!.correctCount ?? 0) * 100 ~/ arguments!.totalQuestions!)
        : board.accuracy;
    final correct = arguments?.correctCount;
    final total = arguments?.totalQuestions;

    return Scaffold(
      backgroundColor: AppColors.deepSpace,
      appBar: AppBar(
        title: const Text('Quiz Results'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(horizontal: Responsive(context).scale(20), vertical: Responsive(context).scale(16)),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 32,
                ),
                child: IntrinsicHeight(
                  child: Column(
                    children: [
                      const SizedBox(height: 12),
                      // Trophy Badge
                      Container(
                        width: 88,
                        height: 88,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.gold.withValues(alpha: 0.15),
                          border: Border.all(color: AppColors.gold, width: 2),
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.emoji_events_rounded,
                            size: 48,
                            color: AppColors.gold,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Quiz Completed!',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.foreground,
                        ),
                      ),
                      const SizedBox(height: 6),
                      const Text(
                        'Great effort! Check out your stats below.',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppColors.slate400,
                        ),
                      ),
                      const SizedBox(height: 20),
                      // Results Cards
                      GlassCard(
                        child: Padding(
                          padding: EdgeInsets.all(Responsive(context).scale(16)),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _StatColumn(
                                label: 'Score',
                                value: '$score',
                                icon: Icons.star_rounded,
                                color: AppColors.neoMint,
                              ),
                              _StatColumn(
                                label: 'Accuracy',
                                value: '$accuracy%',
                                icon: Icons.track_changes_rounded,
                                color: AppColors.electricIndigo,
                              ),
                              _StatColumn(
                                label: 'Streak',
                                value: '$streak 🔥',
                                icon: Icons.local_fire_department_rounded,
                                color: AppColors.popCoral,
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (correct != null && total != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          'You answered $correct out of $total questions correctly.',
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.slate300,
                          ),
                        ),
                      ],
                      const Spacer(),
                      const SizedBox(height: 24),
                      // Action Buttons
                      ElevatedButton.icon(
                        onPressed: () {
                          ref.invalidate(quizProvider);
                          Navigator.of(context).pushReplacementNamed('/quiz');
                        },
                        icon: const Icon(Icons.replay_rounded),
                        label: const Text('Play Again'),
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                          backgroundColor: AppColors.neoMint,
                          foregroundColor: AppColors.deepSpace,
                          textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: () {
                          final qs = ref.read(quizProvider).questions.value ?? [];
                          if (qs.isEmpty) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('No quiz questions to save.')),
                            );
                            return;
                          }
                          promptSaveQuizDialog(context, ref, questions: qs);
                        },
                        icon: const Icon(Icons.bookmark_add_outlined, color: AppColors.neoMint),
                        label: const Text('Save Quiz List for Reuse'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                          foregroundColor: AppColors.neoMint,
                          side: const BorderSide(color: AppColors.neoMint),
                        ),
                      ),
                      const SizedBox(height: 10),
                      OutlinedButton.icon(
                        onPressed: () {
                          Navigator.of(context).pushNamedAndRemoveUntil('/main', (route) => false);
                        },
                        icon: const Icon(Icons.home_rounded),
                        label: const Text('Back to Home'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size.fromHeight(50),
                          foregroundColor: AppColors.foreground,
                          side: const BorderSide(color: AppColors.cyberBorder),
                        ),
                      ),
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  const _StatColumn({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 6),
        Text(
          value,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: AppColors.foreground,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.slate400,
          ),
        ),
      ],
    );
  }
}
