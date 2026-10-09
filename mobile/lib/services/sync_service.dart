import 'dart:async';
import '../api/api_client.dart';
import '../db/quiz_repository.dart';

class SyncService {
  final ApiClient _apiClient;
  final QuizRepository _quizRepository;
  Timer? _timer;

  SyncService(this._apiClient, this._quizRepository) {
    // Basic polling mechanism for syncing if network events are not available
    // In a production app, we would use connectivity_plus to listen to network changes
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => syncAnswers());
  }

  void dispose() {
    _timer?.cancel();
  }

  Future<void> syncAnswers() async {
    final queued = await _quizRepository.getQueuedAnswers();
    if (queued.isEmpty) return;

    try {
      final payload = queued.map((e) => {
        'questionId': e['questionId'],
        'answerIndex': e['answerIndex'],
        'timestamp': e['timestamp'],
      }).toList();

      final response = await _apiClient.post('/quiz/sync', payload);

      // If successful, clear the synced answers from the queue
      final ids = queued.map((e) => e['id'] as int).toList();
      await _quizRepository.clearQueuedAnswers(ids);

      print('Successfully synced \${ids.length} answers');
      // In a full implementation, we'd also dispatch an event to show results
    } catch (e) {
      print('Sync failed, will retry later: \$e');
    }
  }
}
