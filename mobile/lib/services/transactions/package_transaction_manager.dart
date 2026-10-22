import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:quickquiz_sdk/quickquiz_sdk.dart';
import '../tier/tier_provider.dart';

class PackageTransactionState {
  final bool isLoading;
  final PackageTransaction? lastTransaction;
  final String? errorMessage;
  final UpgradePackage? selectedPackage;

  const PackageTransactionState({
    this.isLoading = false,
    this.lastTransaction,
    this.errorMessage,
    this.selectedPackage,
  });

  PackageTransactionState copyWith({
    bool? isLoading,
    PackageTransaction? lastTransaction,
    String? errorMessage,
    UpgradePackage? selectedPackage,
  }) {
    return PackageTransactionState(
      isLoading: isLoading ?? this.isLoading,
      lastTransaction: lastTransaction ?? this.lastTransaction,
      errorMessage: errorMessage,
      selectedPackage: selectedPackage ?? this.selectedPackage,
    );
  }
}

final sdkTransactionManagerProvider = Provider<TransactionManager>((ref) {
  return TransactionManager();
});

class PackageTransactionNotifier extends StateNotifier<PackageTransactionState> {
  PackageTransactionNotifier(this._ref, this._sdkManager)
      : super(const PackageTransactionState());

  final Ref _ref;
  final TransactionManager _sdkManager;

  List<UpgradePackage> getPackages() => _sdkManager.getPackages();

  UpgradePackage? getPackage(String packageId) => _sdkManager.getPackage(packageId);

  void selectPackage(UpgradePackage package) {
    state = state.copyWith(selectedPackage: package, errorMessage: null);
  }

  Future<PackageTransaction> purchasePackage(
    String packageId, {
    String? userId,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final txn = await _sdkManager.purchasePackage(packageId, userId: userId);

      if (txn.status == 'verified') {
        _ref.read(tierProvider.notifier).upgradeToPro();
        state = state.copyWith(
          isLoading: false,
          lastTransaction: txn,
          errorMessage: null,
        );
      } else {
        state = state.copyWith(
          isLoading: false,
          lastTransaction: txn,
          errorMessage: txn.errorReason ?? 'Transaction ${txn.status}',
        );
      }
      return txn;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      rethrow;
    }
  }

  Future<List<PackageTransaction>> restorePurchases({String? userId}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final restored = await _sdkManager.restorePurchases(userId: userId);
      final hasVerified = restored.any((t) => t.status == 'verified');

      if (hasVerified) {
        _ref.read(tierProvider.notifier).upgradeToPro();
      }

      state = state.copyWith(
        isLoading: false,
        lastTransaction: restored.isNotEmpty ? restored.last : null,
      );
      return restored;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      rethrow;
    }
  }
}

final packageTransactionManagerProvider =
    StateNotifierProvider<PackageTransactionNotifier, PackageTransactionState>((ref) {
  final sdkManager = ref.watch(sdkTransactionManagerProvider);
  return PackageTransactionNotifier(ref, sdkManager);
});
