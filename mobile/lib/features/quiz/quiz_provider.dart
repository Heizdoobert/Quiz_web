import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../db/quiz_repository.dart';
import '../../api/api_client.dart';
import '../auth/auth_provider.dart';

final quizRepositoryProvider = Provider((ref) => QuizRepository());

class QuizState {
  final AsyncValue<List<Map<String, dynamic>>> questions;
  final int pendingSyncCount;

  QuizState({
    required this.questions,
    this.pendingSyncCount = 0,
  });

  QuizState copyWith({
    AsyncValue<List<Map<String, dynamic>>>? questions,
    int? pendingSyncCount,
  }) {
    return QuizState(
      questions: questions ?? this.questions,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
    );
  }
}

final quizProvider = NotifierProvider<QuizNotifier, QuizState>(QuizNotifier.new);

class QuizNotifier extends Notifier<QuizState> {
  @override
  QuizState build() {
    Future.microtask(loadData);
    return QuizState(questions: const AsyncValue.loading());
  }

  Future<void> loadData() async {
    state = state.copyWith(questions: const AsyncValue.loading());
    final repo = ref.read(quizRepositoryProvider);
    final api = ref.read(apiClientProvider);

    try {
      try {
        final response = await api.get('/quiz/questions');
        final data = response['questions'] as List;
        final questionsList = List<Map<String, dynamic>>.from(data);
        await repo.cacheQuestions(questionsList);
      } catch (e) {
        print("Failed to fetch questions from API: \$e");
      }

      final cached = await repo.getCachedQuestions();
      final queued = await repo.getQueuedAnswers();
      
      state = state.copyWith(
        questions: AsyncValue.data(cached),
        pendingSyncCount: queued.length,
      );
    } catch (e, st) {
      state = state.copyWith(questions: AsyncValue.error(e, st));
    }
  }

  Future<void> submitAnswer(String questionId, int answerIndex) async {
    final repo = ref.read(quizRepositoryProvider);
    await repo.queueAnswer(questionId, answerIndex);
    
    final queued = await repo.getQueuedAnswers();
    state = state.copyWith(pendingSyncCount: queued.length);
  }
}
