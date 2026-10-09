import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../db/quiz_repository.dart';
import '../features/auth/auth_provider.dart';

final syncServiceProvider = Provider(
  (ref) => SyncService(ref.watch(apiClientProvider), ref.watch(quizRepositoryProvider)),
);

/// The queued rows the server is finished with. A row stays queued only when the server
/// could not look at it yet (rate-limited) or sent no verdict for it. Everything else is
/// final: recorded, already answered, own question, or a question that is gone.
List<int> settledIds(List<Map<String, dynamic>> queued, Map<String, dynamic> results) {
  return [
    for (final row in queued)
      if (_isSettled(results[row['questionId']])) row['id'] as int,
  ];
}

bool _isSettled(Object? result) {
  if (result is! Map) return false;
  return result['recorded'] == true || result['notSavedReason'] != 'rate-limited';
}

class SyncService {
  SyncService(this._apiClient, this._quizRepository);

  final ApiClient _apiClient;
  final QuizRepository _quizRepository;
  bool _running = false;
  DateTime? _pausedUntil;

  /// Sends the queued answers and drops the ones the server has settled. A network error or
  /// a non-2xx answer keeps the whole queue for the next try.
  Future<void> syncAnswers() async {
    final pausedUntil = _pausedUntil;
    if (_running || (pausedUntil != null && DateTime.now().isBefore(pausedUntil))) return;
    _running = true;
    try {
      final queued = await _quizRepository.getQueuedAnswers();
      if (queued.isEmpty) return;

      final response = await _apiClient.post('/quiz/sync', [
        for (final e in queued)
          {'questionId': e['questionId'], 'answerIndex': e['answerIndex'], 'timestamp': e['timestamp']},
      ]);
      final results = (response['results'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      await _quizRepository.clearQueuedAnswers(settledIds(queued, results));

      // The server limits answers per hour; asking again every 30 seconds only keeps it limited.
      if (results.values.any((r) => r is Map && r['notSavedReason'] == 'rate-limited')) {
        _pausedUntil = DateTime.now().add(const Duration(minutes: 10));
      }
    } catch (e) {
      debugPrint('Sync failed, will retry later: $e');
    } finally {
      _running = false;
    }
  }
}
