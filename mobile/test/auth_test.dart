import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/auth_provider.dart';

void main() {
  test('the same account signing back in keeps its queued answers', () {
    expect(keepsQueue('acc1', 'acc1'), isTrue);
  });

  test('another account signing in drops the queue it did not answer', () {
    expect(keepsQueue('acc1', 'acc2'), isFalse);
  });

  test('an install with no saved account keeps the queue rather than lose answers', () {
    expect(keepsQueue(null, 'acc1'), isTrue);
  });
}
