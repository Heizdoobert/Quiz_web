import 'dart:async';
import 'models.dart';

class PaymentResult {
  const PaymentResult({
    required this.success,
    required this.status,
    required this.receipt,
    this.errorReason,
  });

  final bool success;
  final String status;
  final String receipt;
  final String? errorReason;
}

abstract class PaymentGatewayAdapter {
  String get gatewayName;

  Future<PaymentResult> requestPayment(
    UpgradePackage package, {
    String? userId,
  });

  Future<bool> verifyReceipt(
    String receipt, {
    required String transactionId,
  });
}

class SandboxGatewayAdapter implements PaymentGatewayAdapter {
  SandboxGatewayAdapter({
    this.shouldFail = false,
    this.shouldCancel = false,
    this.failureReason = 'Payment declined by issuing bank',
    this.latencyMs = 10,
  });

  final bool shouldFail;
  final bool shouldCancel;
  final String failureReason;
  final int latencyMs;

  @override
  String get gatewayName => 'sandbox';

  @override
  Future<PaymentResult> requestPayment(
    UpgradePackage package, {
    String? userId,
  }) async {
    if (latencyMs > 0) {
      await Future<void>.delayed(Duration(milliseconds: latencyMs));
    }

    if (shouldCancel) {
      return const PaymentResult(
        success: false,
        status: 'cancelled',
        receipt: '',
        errorReason: 'Payment cancelled by user',
      );
    }

    if (shouldFail) {
      return PaymentResult(
        success: false,
        status: 'failed',
        receipt: '',
        errorReason: failureReason,
      );
    }

    final ts = DateTime.now().millisecondsSinceEpoch;
    final receipt = 'sandbox_rcpt_${package.id}_${userId ?? "anon"}_$ts';
    return PaymentResult(
      success: true,
      status: 'verified',
      receipt: receipt,
    );
  }

  @override
  Future<bool> verifyReceipt(
    String receipt, {
    required String transactionId,
  }) async {
    return receipt.startsWith('sandbox_rcpt_');
  }
}

class TransactionManager {
  TransactionManager({
    PaymentGatewayAdapter? gateway,
    List<UpgradePackage>? packages,
  })  : gateway = gateway ?? SandboxGatewayAdapter(),
        _packages = packages ?? _defaultPackages;

  final PaymentGatewayAdapter gateway;
  final List<UpgradePackage> _packages;
  final List<PackageTransaction> _history = [];
  final StreamController<PackageTransaction> _streamController =
      StreamController<PackageTransaction>.broadcast();

  Stream<PackageTransaction> get onTransactionChange => _streamController.stream;

  static final List<UpgradePackage> _defaultPackages = [
    UpgradePackage(
      id: 'pro_monthly',
      name: 'Pro Monthly',
      description: 'Monthly unlimited access to all Pro features and challenge groups.',
      price: 4.99,
      interval: 'month',
      badge: 'Flexible',
      features: const [
        'Full Limit: Unlimited Quizzes',
        'Open & Host Challenge Groups',
        'Challenger Rank Multiplier (1.5x)',
        'Full Cloud Sync & Friend Feeds',
      ],
    ),
    UpgradePackage(
      id: 'pro_annual',
      name: 'Pro Annual',
      description: 'Annual membership with 33% discount. Best value for dedicated quizmasters.',
      price: 39.99,
      interval: 'year',
      badge: 'Best Value',
      savingsPercentage: 33,
      features: const [
        'Full Limit: Unlimited Quizzes',
        'Open & Host Challenge Groups',
        'Challenger Rank Multiplier (2.0x Boost)',
        'Priority Cloud Sync & Offline Backup',
        'Early Access to New Quizzes & Features',
      ],
    ),
    UpgradePackage(
      id: 'pro_lifetime',
      name: 'Pro Lifetime VIP',
      description: 'Pay once, unlock Pro and challenger groups forever.',
      price: 79.99,
      interval: 'lifetime',
      badge: 'Forever VIP',
      features: const [
        'Lifetime Unlimited Quizzes',
        'Unlimited Challenge Arenas Forever',
        'Max Challenger Multiplier (2.5x)',
        'Founder Badge on Global Leaderboard',
        'All Future Pro Updates Included',
      ],
    ),
  ];

  List<UpgradePackage> getPackages() => List.unmodifiable(_packages);

  UpgradePackage? getPackage(String packageId) {
    try {
      return _packages.firstWhere((p) => p.id == packageId);
    } catch (_) {
      return null;
    }
  }

  Future<PackageTransaction> purchasePackage(
    String packageId, {
    String? userId,
  }) async {
    final pkg = getPackage(packageId);
    if (pkg == null) {
      throw ArgumentError('Package "$packageId" not found in catalog');
    }

    final cleanUserId = userId != null
        ? (userId.length > 128 ? userId.substring(0, 128) : userId).trim()
        : '';
    final now = DateTime.now().toUtc().toIso8601String();
    final txnId = 'txn_${DateTime.now().millisecondsSinceEpoch}_${pkg.id}';

    // Step 1: Initiated
    var txn = PackageTransaction(
      transactionId: txnId,
      packageId: pkg.id,
      userId: cleanUserId,
      amount: pkg.price,
      currency: pkg.currency,
      status: 'initiated',
      gateway: gateway.gatewayName,
      receipt: '',
      startedAt: now,
    );
    _record(txn);

    // Step 2: Processing via Gateway
    final result = await gateway.requestPayment(pkg, userId: cleanUserId);

    final completedAt = DateTime.now().toUtc().toIso8601String();

    if (!result.success) {
      txn = txn.copyWith(
        status: result.status,
        receipt: result.receipt,
        completedAt: completedAt,
        errorReason: result.errorReason,
      );
      _record(txn);
      return txn;
    }

    // Step 3: Verification
    final isValid = await gateway.verifyReceipt(result.receipt, transactionId: txnId);
    if (!isValid) {
      txn = txn.copyWith(
        status: 'failed',
        receipt: result.receipt,
        completedAt: completedAt,
        errorReason: 'Receipt validation failed',
      );
      _record(txn);
      return txn;
    }

    // Step 4: Verified
    txn = txn.copyWith(
      status: 'verified',
      receipt: result.receipt,
      completedAt: completedAt,
    );
    _record(txn);
    return txn;
  }

  Future<List<PackageTransaction>> restorePurchases({String? userId}) async {
    // In sandbox or store kit, finds verified transactions for user
    return _history
        .where((t) => t.status == 'verified' && (userId == null || t.userId == userId))
        .toList();
  }

  List<PackageTransaction> getHistory() => List.unmodifiable(_history);

  PackageTransaction? getTransaction(String transactionId) {
    try {
      return _history.firstWhere((t) => t.transactionId == transactionId);
    } catch (_) {
      return null;
    }
  }

  void _record(PackageTransaction txn) {
    final idx = _history.indexWhere((t) => t.transactionId == txn.transactionId);
    if (idx >= 0) {
      _history[idx] = txn;
    } else {
      _history.add(txn);
    }
    _streamController.add(txn);
  }

  void dispose() {
    _streamController.close();
  }
}
