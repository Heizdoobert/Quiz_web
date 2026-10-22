import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/tier/session_quiz_store.dart';

void main() {
  test('SessionQuizStore strictly caps at 20 quizzes and stays in memory', () {
    final store = SessionQuizStore();

    expect(store.count, equals(0));
    expect(store.isFull, isFalse);

    // Add 20 questions
    for (int i = 1; i <= 20; i++) {
      final added = store.addQuestion({
        'id': 'session_$i',
        'prompt': 'Question $i',
        'options': ['A', 'B', 'C', 'D'],
        'category': 'General',
      });
      expect(added, isTrue);
    }

    expect(store.count, equals(20));
    expect(store.isFull, isTrue);

    // 21st question must be rejected
    final rejected = store.addQuestion({
      'id': 'session_21',
      'prompt': 'Question 21',
      'options': ['A', 'B', 'C', 'D'],
      'category': 'General',
    });
    expect(rejected, isFalse);
    expect(store.count, equals(20));

    // Clear works
    store.clear();
    expect(store.count, equals(0));
    expect(store.isFull, isFalse);
  });
}
