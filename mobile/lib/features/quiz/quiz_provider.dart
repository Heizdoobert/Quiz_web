import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../db/quiz_repository.dart';
import '../../services/sync_service.dart';
import '../auth/auth_provider.dart';

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
    // Answers given offline go up as soon as a request gets through.
    final timer = Timer.periodic(const Duration(seconds: 30), (_) => _sync());
    ref.onDispose(timer.cancel);
    // Signing in (again, after an expired session) sends what queued up meanwhile right away.
    ref.listen(authProvider.select((a) => a.isAuthenticated), (_, signedIn) {
      if (signedIn) _sync();
    });
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
        // An empty list is a failed pick on the server, not a reason to wipe the offline cache.
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

    final queued = await repo.getQueuedAnswers();
    state = state.copyWith(pendingSyncCount: queued.length);
    await _sync();
  }

  /// Sends what is still queued, then clears it. Answers the server could not take are
  /// dropped here so the next account to sign in on this device is not credited with them.
  Future<void> signOut() async {
    await ref.read(syncServiceProvider).syncAnswers();
    await ref.read(quizRepositoryProvider).clearAllQueuedAnswers();
    await ref.read(authProvider.notifier).logout();
    if (ref.mounted) state = state.copyWith(pendingSyncCount: 0);
  }

  Future<void> _sync() async {
    await ref.read(syncServiceProvider).syncAnswers();
    if (!ref.mounted) return;
    final queued = await ref.read(quizRepositoryProvider).getQueuedAnswers();
    if (ref.mounted) state = state.copyWith(pendingSyncCount: queued.length);
  }
}
