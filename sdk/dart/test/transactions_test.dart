import 'package:quickquiz_sdk/quickquiz_sdk.dart';
import 'package:test/test.dart';

void main() {
  group('TransactionManager (Dart SDK)', () {
    late TransactionManager manager;

    setUp(() {
      manager = TransactionManager(gateway: SandboxGatewayAdapter());
    });

    test('getPackages returns monthly, annual, and lifetime packages', () {
      final packages = manager.getPackages();
      expect(packages.length, 3);

      final monthly = packages.firstWhere((p) => p.id == 'pro_monthly');
      expect(monthly.price, 4.99);
      expect(monthly.interval, 'month');

      final annual = packages.firstWhere((p) => p.id == 'pro_annual');
      expect(annual.price, 39.99);
      expect(annual.interval, 'year');
      expect(annual.savingsPercentage, 33);

      final lifetime = packages.firstWhere((p) => p.id == 'pro_lifetime');
      expect(lifetime.price, 79.99);
      expect(lifetime.interval, 'lifetime');
    });

    test('purchasePackage succeeds and returns verified transaction in sandbox', () async {
      final txn = await manager.purchasePackage('pro_annual', userId: 'user_123');

      expect(txn.packageId, 'pro_annual');
      expect(txn.userId, 'user_123');
      expect(txn.amount, 39.99);
      expect(txn.currency, 'USD');
      expect(txn.status, 'verified');
      expect(txn.gateway, 'sandbox');
      expect(txn.receipt.isNotEmpty, isTrue);
      expect(txn.completedAt, isNotNull);

      // Check transaction exists in history
      final history = manager.getHistory();
      expect(history.any((t) => t.transactionId == txn.transactionId), isTrue);
    });

    test('purchasePackage handles card declined error from gateway', () async {
      final decliningManager = TransactionManager(
        gateway: SandboxGatewayAdapter(shouldFail: true, failureReason: 'Card declined (insufficient funds)'),
      );

      final txn = await decliningManager.purchasePackage('pro_monthly', userId: 'user_456');

      expect(txn.status, 'failed');
      expect(txn.errorReason, contains('Card declined'));
      expect(txn.completedAt, isNotNull);
    });

    test('purchasePackage handles user cancellation from gateway', () async {
      final cancellingManager = TransactionManager(
        gateway: SandboxGatewayAdapter(shouldCancel: true),
      );

      final txn = await cancellingManager.purchasePackage('pro_lifetime', userId: 'user_789');

      expect(txn.status, 'cancelled');
      expect(txn.errorReason, contains('cancelled'));
    });

    test('restorePurchases recovers active entitlements', () async {
      // First purchase a package
      await manager.purchasePackage('pro_annual', userId: 'user_abc');

      // Now restore
      final restored = await manager.restorePurchases(userId: 'user_abc');
      expect(restored.isNotEmpty, isTrue);
      expect(restored.first.packageId, 'pro_annual');
      expect(restored.first.status, 'verified');
    });

    test('QuickQuizClient exposes transactions resource', () {
      final client = QuickQuizClient(baseUrl: 'https://test.quickquiz.app/api');
      expect(client.transactions, isNotNull);
      expect(client.transactions.getPackages().length, 3);
    });
  });
}
