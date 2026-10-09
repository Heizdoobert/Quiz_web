import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/sync_service.dart';

void main() {
  final queued = [
    {'id': 1, 'questionId': 'a'},
    {'id': 2, 'questionId': 'b'},
    {'id': 3, 'questionId': 'c'},
    {'id': 4, 'questionId': 'd'},
    {'id': 5, 'questionId': 'e'},
  ];

  test('a recorded answer leaves the queue', () {
    final results = {'a': {'recorded': true}};
    expect(settledIds([queued.first], results), [1]);
  });

  test('final server verdicts leave the queue, rate-limited and silent ones stay', () {
    final results = {
      'a': {'recorded': false, 'notSavedReason': 'already-answered'},
      'b': {'recorded': false, 'notSavedReason': 'own-question'},
      'c': {'recorded': false, 'notSavedReason': 'rate-limited'},
      'd': {'recorded': false, 'notSavedReason': 'error'},
      // 'e' has no verdict at all
    };
    expect(settledIds(queued, results), [1, 2, 4]);
  });

  test('an empty or malformed result keeps everything queued', () {
    expect(settledIds(queued, const {}), isEmpty);
    expect(settledIds(queued, {'a': 'nope'}), isEmpty);
  });
}
