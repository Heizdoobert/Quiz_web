import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../widgets/glass_card.dart';
import 'quiz_provider.dart';
import 'quiz_screen.dart';

/// Shows a list of answered questions with the ability to edit each answer.
class ReviewScreen extends ConsumerWidget {
  const ReviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quiz = ref.watch(quizProvider);
    // Filter questions that have an answer recorded.
    final answered = quiz.questions.when(
  data: (qs) => qs.where((q) => quiz.answers.containsKey(q['id'] as String)).toList(),
  loading: () => [],
  error: (_, __) => [],
);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Review Answers'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: answered.length,
          itemBuilder: (context, index) {
            final q = answered[index];
            final qId = q['id'] as String;
            final selected = quiz.answers[qId];
            return GlassCard(
              child: ListTile(
                title: Text(q['question'] as String? ?? 'Question'),
                subtitle: Text('Selected: ${selected != null ? _letters[selected] : 'None'}'),
                trailing: TextButton(
                  child: const Text('Edit'),
                  onPressed: () {
                    // Navigate back to the quiz screen with the specific question pre‑selected.
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => QuizScreen(initialQuestionId: qId)),
                    );
                  },
                ),
              ),
            );
          },
        ),
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ElevatedButton(
          child: const Text('Submit'),
          onPressed: () {
            // Call the existing submit logic.
            ref.read(quizProvider.notifier).finalizeQuiz();
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Quiz submitted!')));
            Navigator.of(context).popUntil((route) => route.isFirst);
          },
        ),
      ),
    );
  }

  static const _letters = ['A', 'B', 'C', 'D'];
}
