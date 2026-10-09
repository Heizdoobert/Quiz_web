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

final quizProvider = StateNotifierProvider<QuizNotifier, QuizState>((ref) {
  final repo = ref.watch(quizRepositoryProvider);
  final api = ref.watch(apiClientProvider);
  return QuizNotifier(repo, api);
});

class QuizNotifier extends StateNotifier<QuizState> {
  final QuizRepository _repo;
  final ApiClient _api;

  QuizNotifier(this._repo, this._api) : super(QuizState(questions: const AsyncValue.loading())) {
    loadData();
  }

  Future<void> loadData() async {
    state = state.copyWith(questions: const AsyncValue.loading());
    try {
      // Refresh questions from API if possible
      try {
        final response = await _api.get('/quiz/questions'); // baseUrl already has /api/mobile/v1
        final data = response['questions'] as List;
        final questionsList = List<Map<String, dynamic>>.from(data);
        await _repo.cacheQuestions(questionsList);
      } catch (e) {
        // Ignore API errors, fallback to cache
        print("Failed to fetch questions from API: \$e");
      }

      final cached = await _repo.getCachedQuestions();
      final queued = await _repo.getQueuedAnswers();
      
      state = state.copyWith(
        questions: AsyncValue.data(cached),
        pendingSyncCount: queued.length,
      );
    } catch (e, st) {
      state = state.copyWith(questions: AsyncValue.error(e, st));
    }
  }

  Future<void> submitAnswer(String questionId, int answerIndex) async {
    // 1. Queue locally
    await _repo.queueAnswer(questionId, answerIndex);
    
    // 2. Update state to reflect pending sync
    final queued = await _repo.getQueuedAnswers();
    state = state.copyWith(pendingSyncCount: queued.length);
    
    // Attempt sync is done by background sync engine, but we could also trigger an immediate sync here
  }
}
