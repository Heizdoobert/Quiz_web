import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:quickquiz_sdk/quickquiz_sdk.dart';
import 'package:mobile/services/transactions/package_transaction_manager.dart';
import 'package:mobile/services/tier/tier_provider.dart';

void main() {
  group('PackageTransactionManager Service', () {
    test('retrieves available packages from SDK TransactionManager', () {
      final container = ProviderContainer(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
        ],
      );
      final manager = container.read(packageTransactionManagerProvider.notifier);

      final packages = manager.getPackages();
      expect(packages.length, 3);
      expect(packages.map((p) => p.id), containsAll(['pro_monthly', 'pro_annual', 'pro_lifetime']));
    });

    test('purchasePackage elevates tierProvider to Pro on verified transaction', () async {
      final container = ProviderContainer(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
        ],
      );
      expect(container.read(tierProvider).isPro, isFalse);

      final manager = container.read(packageTransactionManagerProvider.notifier);
      final txn = await manager.purchasePackage('pro_annual', userId: 'player_1');

      expect(txn.status, 'verified');
      expect(txn.packageId, 'pro_annual');

      // Check state
      final state = container.read(packageTransactionManagerProvider);
      expect(state.lastTransaction?.status, 'verified');
      expect(state.isLoading, isFalse);

      // Check tierProvider was automatically elevated to Pro!
      expect(container.read(tierProvider).isPro, isTrue);
    });

    test('purchasePackage does not elevate tierProvider if transaction fails', () async {
      final failingSdkManager = TransactionManager(
        gateway: SandboxGatewayAdapter(shouldFail: true, failureReason: 'Card expired'),
      );

      final container = ProviderContainer(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
          sdkTransactionManagerProvider.overrideWithValue(failingSdkManager),
        ],
      );

      expect(container.read(tierProvider).isPro, isFalse);

      final manager = container.read(packageTransactionManagerProvider.notifier);
      final txn = await manager.purchasePackage('pro_monthly', userId: 'player_2');

      expect(txn.status, 'failed');
      expect(txn.errorReason, 'Card expired');

      // State reflects error
      final state = container.read(packageTransactionManagerProvider);
      expect(state.lastTransaction?.status, 'failed');
      expect(state.errorMessage, 'Card expired');

      // Tier remains un-upgraded
      expect(container.read(tierProvider).isPro, isFalse);
    });

    test('restorePurchases restores previous verified transaction and elevates tier', () async {
      final sdkManager = TransactionManager(gateway: SandboxGatewayAdapter());
      // Seed a verified purchase in SDK
      await sdkManager.purchasePackage('pro_lifetime', userId: 'player_3');

      final container = ProviderContainer(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
          sdkTransactionManagerProvider.overrideWithValue(sdkManager),
        ],
      );

      expect(container.read(tierProvider).isPro, isFalse);

      final manager = container.read(packageTransactionManagerProvider.notifier);
      final restored = await manager.restorePurchases(userId: 'player_3');

      expect(restored.length, 1);
      expect(restored.first.packageId, 'pro_lifetime');
      expect(container.read(tierProvider).isPro, isTrue);
    });
  });
}
