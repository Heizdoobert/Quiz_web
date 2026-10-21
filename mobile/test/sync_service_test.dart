import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:mobile/services/sync/sync_service.dart';
import 'package:mobile/api/api_client.dart';
import 'package:mobile/db/quiz_repository.dart';

class MockApiClient extends Mock implements ApiClient {}

class MockQuizRepository extends Mock implements QuizRepository {}

void main() {
  late MockApiClient mockApiClient;
  late MockQuizRepository mockRepo;
  late SyncService syncService;

// Register fallback values for mocktail matchers
  setUpAll(() {
    // For any List used as request body
    registerFallbackValue([]);
    // For any List<int> used in clearQueuedAnswers
    registerFallbackValue(<int>[]);
    // For any Map used as parameters (if needed)
    registerFallbackValue({});
  });

  setUp(() {
    mockApiClient = MockApiClient();
    mockRepo = MockQuizRepository();
    syncService = SyncService(mockApiClient, mockRepo);
    // Default stub for clearQueuedAnswers to return a completed Future.
    when(() => mockRepo.clearQueuedAnswers(any()))
        .thenAnswer((_) async {});
  });

  test('rate‑limited response sets pause and increments backoff', () async {
    // Arrange: repository returns one queued answer.
    final queued = [
      {
        'id': 1,
        'questionId': 'q1',
        'answerIndex': 0,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'client_uuid': 'test-uuid',
      }
    ];
    when(() => mockRepo.getQueuedAnswers()).thenAnswer((_) async => queued);
    // ApiClient returns a rate‑limited result.
    when(() => mockApiClient.post('/quiz/sync', any()))
        .thenAnswer((_) async => {
              'results': {
                'q1': {'recorded': false, 'notSavedReason': 'rate-limited'}
              }
            });
    // Act.
    await syncService.syncAnswers();
    // Assert.
    expect(syncService.isPaused, isTrue);
    expect(syncService.backoffAttempts, equals(1));
    // Verify that the queued answers were not cleared.
    verifyNever(() => mockRepo.clearQueuedAnswers(any()));
  });

  test('successful sync resets backoff and clears pause', () async {
    // Arrange: first call simulates rate‑limited, second call successful.
    final queued = [
      {
        'id': 1,
        'questionId': 'q1',
        'answerIndex': 0,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
        'client_uuid': 'test-uuid',
      }
    ];
    when(() => mockRepo.getQueuedAnswers()).thenAnswer((_) async => queued);

    // First rate‑limited response.
    when(() => mockApiClient.post('/quiz/sync', any()))
        .thenAnswer((_) async => {
              'results': {
                'q1': {'recorded': false, 'notSavedReason': 'rate-limited'}
              }
            });
    await syncService.syncAnswers();
    expect(syncService.isPaused, isTrue);
    expect(syncService.backoffAttempts, equals(1));

    // Now mock a successful response.
    when(() => mockApiClient.post('/quiz/sync', any()))
        .thenAnswer((_) async => {
              'results': {'q1': {'recorded': true}}
            });
    // Clear the pause manually to allow sync.
    // The service checks _pausedUntil, so we set it to past.
    // Using reflection is not needed; we directly set the private field via a helper.
    // Since we cannot access _pausedUntil, we simulate by waiting for the pause to expire.
    // For test speed, we override the getter by calling syncService.syncAnswers() after
    // manually resetting _pausedUntil via a test‑only extension.
    // Create a test‑only subclass to expose reset.
    // Here we simply call the method after resetting internal state via a cast.
    // ignore: avoid_as
    syncService.resetPauseForTest();

    await syncService.syncAnswers();
    expect(syncService.isPaused, isFalse);
    expect(syncService.backoffAttempts, equals(0));
    // Verify that repository cleared the queued answer.
    verify(() => mockRepo.clearQueuedAnswers([1])).called(1);
  });
}
