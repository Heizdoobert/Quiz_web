import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'quiz_provider.dart';

class QuizScreen extends ConsumerWidget {
  const QuizScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final quizState = ref.watch(quizProvider);
    final quizNotifier = ref.read(quizProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Quiz'),
        actions: [
          if (quizState.pendingSyncCount > 0)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Text(
                  'Pending Sync: \${quizState.pendingSyncCount}',
                  style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
                ),
              ),
            ),
        ],
      ),
      body: quizState.questions.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: \$err')),
        data: (questions) {
          if (questions.isEmpty) {
            return const Center(child: Text('No questions available offline.'));
          }
          
          return ListView.builder(
            itemCount: questions.length,
            itemBuilder: (context, index) {
              final q = questions[index];
              final options = List<String>.from(q['options']);

              return Card(
                margin: const EdgeInsets.all(8.0),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        q['prompt'],
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 16),
                      ...List.generate(options.length, (optIndex) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: ElevatedButton(
                            onPressed: () {
                              quizNotifier.submitAnswer(q['id'], optIndex);
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Answer saved offline!')),
                              );
                            },
                            child: Text(options[optIndex]),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          quizNotifier.loadData();
        },
        child: const Icon(Icons.refresh),
      ),
    );
  }
}
