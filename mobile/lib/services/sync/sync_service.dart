import 'dart:async';
import 'dart:math' as math;
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../api/api_client.dart';
import '../../db/quiz_repository.dart';
import '../../features/auth/auth_provider.dart';
import 'dart:developer' as dev;

/// Exponential backoff helper for retrying sync operations.
class _BackoffHelper {
  int _retryAttempts = 0;
  static const Duration _baseDelay = Duration(seconds: 5);
  static const Duration _maxDelay = Duration(minutes: 1);

  Duration compute() {
    // Cap the exponential backoff exponent to avoid overflow.
    final int exponent = math.min(_retryAttempts, 30);
    var delay = _baseDelay * (1 << exponent);
    if (delay > _maxDelay) delay = _maxDelay;
    // Apply jitter ±30% (0.7×delay … 1.3×delay).
    final jitterFactor = 0.7 + math.Random().nextDouble() * 0.6;
    return Duration(milliseconds: (delay.inMilliseconds * jitterFactor).round());
  }

  void reset() => _retryAttempts = 0;
  void increment() => _retryAttempts++;
}

final syncServiceProvider = Provider.autoDispose((ref) {
  final service = SyncService(
    ref.watch(apiClientProvider),
    ref.watch(quizRepositoryProvider),
  );
  service.initConnectivityListener();
  ref.onDispose(() => service.dispose());
  return service;
});

class SyncService {
  SyncService(this._apiClient, this._quizRepository, {this.onRetryRequested});

  final ApiClient _apiClient;
  final QuizRepository _quizRepository;
  final void Function(Duration)? onRetryRequested;

  bool _running = false;
  DateTime? _pausedUntil;
  final _BackoffHelper _backoff = _BackoffHelper();
  StreamSubscription<ConnectivityResult>? _connectivitySubscription;

  /// Starts listening to network connectivity events to automatically trigger
  /// sync when the device reconnects to Wi-Fi, Mobile or Ethernet.
  void initConnectivityListener([Connectivity? connectivity]) {
    final conn = connectivity ?? Connectivity();
    _connectivitySubscription?.cancel();
    _connectivitySubscription = conn.onConnectivityChanged.listen((result) {
      if (result != ConnectivityResult.none) {
        dev.log('Connectivity active ($result), running auto-sync', name: 'SyncService');
        syncAnswers();
      }
    });
  }

  void dispose() {
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }

  /// Sends queued answers to the server and removes those that have been settled.
  /// Handles rate‑limiting by pausing further attempts for a configured period.
  Future<void> syncAnswers() async {
    final pausedUntil = _pausedUntil;
    if (_running || (pausedUntil != null && DateTime.now().isBefore(pausedUntil))) return;
    _running = true;
    try {
      final queued = await _quizRepository.getQueuedAnswers();
      if (queued.isEmpty) {
        // No work to do – reset running flag before returning
        _running = false;
        return;
      }

      final response = await _apiClient.post('/quiz/sync', [
        for (final e in queued)
          {'questionId': e['questionId'], 'answerIndex': e['answerIndex'], 'timestamp': e['timestamp'], 'client_uuid': e['client_uuid']},
      ]);
      final results = (response['results'] as Map?)?.cast<String, dynamic>() ?? const <String, dynamic>{};
      final idsToClear = settledIds(queued, results);
      if (idsToClear.isNotEmpty) {
        await _quizRepository.clearQueuedAnswers(idsToClear);
      }

      // If any answer was rate‑limited, pause future sync attempts.
      if (results.values.any((r) => r is Map && r['notSavedReason'] == 'rate-limited')) {
        _pausedUntil = DateTime.now().add(_backoff.compute());
        _backoff.increment();
      } else {
        _backoff.reset();
        _pausedUntil = null;
      }
    } catch (e) {
      dev.log('Sync failed, will retry later: $e', name: 'SyncService');
      _backoff.increment();
      // Notify optional retry callback with the backoff duration.
      if (onRetryRequested != null) {
        onRetryRequested!(_backoff.compute());
      }
    } finally {
      _running = false;
    }
  }

  bool get isPaused => _pausedUntil != null && DateTime.now().isBefore(_pausedUntil!);
  int get backoffAttempts => _backoff._retryAttempts;

  /// Test‑only helper to reset pause state and backoff counter.
  void resetPauseForTest() {
    _pausedUntil = null;
    _backoff.reset();
  }
}

/// Helper to collect IDs of rows the server has settled.
List<int> settledIds(List<Map<String, dynamic>> queued, Map<String, dynamic> results) {
  final ids = <int>[];
  for (final row in queued) {
    final qId = row['questionId'];
    if (qId is! String) continue; // Skip rows without valid questionId
    final result = results[qId];
    if (_isSettled(result)) {
      ids.add(row['id'] as int);
    }
  }
  return ids;
}

bool _isSettled(Object? result) {
  if (result is! Map) return false;
  return result['recorded'] == true || (result['notSavedReason'] != null && result['notSavedReason'] != 'rate-limited');
}
