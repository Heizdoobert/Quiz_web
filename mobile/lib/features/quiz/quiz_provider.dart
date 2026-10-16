import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/db/quiz_repository.dart';
import '../../services/sync/sync_service.dart';
import '../auth/auth_provider.dart';

class QuizState {
  final AsyncValue<List<Map<String, dynamic>>> questions;
  final Map<String, int> answers; // questionId -> selected index
  final int pendingSyncCount;

  QuizState({
    required this.questions,
    this.answers = const {},
    this.pendingSyncCount = 0,
  });

  QuizState copyWith({
    AsyncValue<List<Map<String, dynamic>>>? questions,
    Map<String, int>? answers,
    int? pendingSyncCount,
  }) {
    return QuizState(
      questions: questions ?? this.questions,
      answers: answers ?? this.answers,
      pendingSyncCount: pendingSyncCount ?? this.pendingSyncCount,
    );
  }
}

final quizProvider = NotifierProvider<QuizNotifier, QuizState>(QuizNotifier.new);

class QuizNotifier extends Notifier<QuizState> {
  @override
  QuizState build() {
    // Periodic sync
    final timer = Timer.periodic(const Duration(seconds: 30), (_) => _sync());
    ref.onDispose(timer.cancel);
    // Sync on sign‑in
    ref.listen(authProvider.select((a) => a.isAuthenticated), (_, signedIn) {
      if (signedIn) _sync();
    });
    // Load data async
    Future.microtask(loadData);
    return QuizState(questions: const AsyncValue.loading());
  }

  Future<void> loadData() async {
    state = state.copyWith(questions: const AsyncValue.loading());
    final repo = ref.read(quizRepositoryProvider);
    final api = ref.read(apiClientProvider);
    try {
      // Try API first
      try {
        final response = await api.get('/quiz/questions');
        final data = response['questions'] as List;
        final questionsList = List<Map<String, dynamic>>.from(data);
        if (questionsList.isNotEmpty) await repo.cacheQuestions(questionsList);
      } catch (e) {
        debugPrint('Failed to fetch questions from API: $e');
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
    await _sync();
  }

  Future<void> submitAnswer(String questionId, int answerIndex) async {
    final repo = ref.read(quizRepositoryProvider);
    await repo.queueAnswer(questionId, answerIndex);
    // Update local answers map
    final newAnswers = Map<String, int>.from(state.answers)
      ..[questionId] = answerIndex;
    final queued = await repo.getQueuedAnswers();
    state = state.copyWith(
      answers: newAnswers,
      pendingSyncCount: queued.length,
    );
    await _sync();
  }

  /// Called when the quiz is finished – clear local answers and sync.
  Future<void> finalizeQuiz() async {
    // Clear stored answers locally
    state = state.copyWith(answers: {});
    // Ensure any queued answers are sent
    await _sync();
  }

  Future<void> signOut() async {
    await ref.read(syncServiceProvider).syncAnswers();
    await ref.read(quizRepositoryProvider).clearAllQueuedAnswers();
    await ref.read(authProvider.notifier).logout();
    if (ref.mounted) state = state.copyWith(pendingSyncCount: 0, answers: {});
  }

  Future<void> _sync() async {
    await ref.read(syncServiceProvider).syncAnswers();
    if (!ref.mounted) return;
    final queued = await ref.read(quizRepositoryProvider).getQueuedAnswers();
    if (ref.mounted) state = state.copyWith(pendingSyncCount: queued.length);
  }
}
