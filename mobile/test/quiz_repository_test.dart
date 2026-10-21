import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:mobile/db/quiz_repository.dart';

void main() {
  // Initialize FFI implementation for sqflite in tests.
  sqfliteFfiInit();
  databaseFactory = databaseFactoryFfi;

  test('queueAnswer generates client_uuid', () async {
    final repo = QuizRepository();
    // Ensure a clean state
    await repo.clearAllQueuedAnswers();

    await repo.queueAnswer('test-question-id', 1);
    final answers = await repo.getQueuedAnswers();
    expect(answers, isNotEmpty);
    final row = answers.first;
    expect(row['client_uuid'], isNotNull);
    expect((row['client_uuid'] as String).isNotEmpty, true);
  });
}
