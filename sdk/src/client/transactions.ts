import type {
  UpgradePackage,
  PackageTransaction,
  PackageId,
  TransactionStatus,
} from '../types';

export interface PaymentResult {
  success: boolean;
  status: TransactionStatus;
  receipt: string;
  errorReason?: string;
}

export interface PaymentGatewayAdapter {
  readonly gatewayName: string;
  requestPayment(
    pkg: UpgradePackage,
    options?: { userId?: string },
  ): Promise<PaymentResult>;
  verifyReceipt(
    receipt: string,
    options: { transactionId: string },
  ): Promise<boolean>;
}

export interface SandboxGatewayOptions {
  shouldFail?: boolean;
  shouldCancel?: boolean;
  failureReason?: string;
  latencyMs?: number;
}

export class SandboxGatewayAdapter implements PaymentGatewayAdapter {
  readonly gatewayName = 'sandbox';
  private shouldFail: boolean;
  private shouldCancel: boolean;
  private failureReason: string;
  private latencyMs: number;

  constructor(options: SandboxGatewayOptions = {}) {
    this.shouldFail = options.shouldFail ?? false;
    this.shouldCancel = options.shouldCancel ?? false;
    this.failureReason = options.failureReason ?? 'Payment declined by issuing bank';
    this.latencyMs = options.latencyMs ?? 10;
  }

  async requestPayment(
    pkg: UpgradePackage,
    options?: { userId?: string },
  ): Promise<PaymentResult> {
    if (this.latencyMs > 0) {
      await new Promise((r) => setTimeout(r, this.latencyMs));
    }

    if (this.shouldCancel) {
      return {
        success: false,
        status: 'cancelled',
        receipt: '',
        errorReason: 'Payment cancelled by user',
      };
    }

    if (this.shouldFail) {
      return {
        success: false,
        status: 'failed',
        receipt: '',
        errorReason: this.failureReason,
      };
    }

    const ts = Date.now();
    const receipt = `sandbox_rcpt_${pkg.id}_${options?.userId ?? 'anon'}_${ts}`;
    return {
      success: true,
      status: 'verified',
      receipt,
    };
  }

  async verifyReceipt(
    receipt: string,
    _options: { transactionId: string },
  ): Promise<boolean> {
    return receipt.startsWith('sandbox_rcpt_');
  }
}

export const DEFAULT_UPGRADE_PACKAGES: UpgradePackage[] = [
  {
    id: 'pro_monthly',
    name: 'Pro Monthly',
    description: 'Monthly unlimited access to all Pro features and challenge groups.',
    price: 4.99,
    currency: 'USD',
    interval: 'month',
    badge: 'Flexible',
    features: [
      'Full Limit: Unlimited Quizzes',
      'Open & Host Challenge Groups',
      'Challenger Rank Multiplier (1.5x)',
      'Full Cloud Sync & Friend Feeds',
    ],
  },
  {
    id: 'pro_annual',
    name: 'Pro Annual',
    description: 'Annual membership with 33% discount. Best value for dedicated quizmasters.',
    price: 39.99,
    currency: 'USD',
    interval: 'year',
    badge: 'Best Value',
    savingsPercentage: 33,
    features: [
      'Full Limit: Unlimited Quizzes',
      'Open & Host Challenge Groups',
      'Challenger Rank Multiplier (2.0x Boost)',
      'Priority Cloud Sync & Offline Backup',
      'Early Access to New Quizzes & Features',
    ],
  },
  {
    id: 'pro_lifetime',
    name: 'Pro Lifetime VIP',
    description: 'Pay once, unlock Pro and challenger groups forever.',
    price: 79.99,
    currency: 'USD',
    interval: 'lifetime',
    badge: 'Forever VIP',
    features: [
      'Lifetime Unlimited Quizzes',
      'Unlimited Challenge Arenas Forever',
      'Max Challenger Multiplier (2.5x)',
      'Founder Badge on Global Leaderboard',
      'All Future Pro Updates Included',
    ],
  },
];

export class TransactionManager {
  readonly gateway: PaymentGatewayAdapter;
  private readonly packages: UpgradePackage[];
  private readonly history: PackageTransaction[] = [];
  private readonly listeners: Set<(txn: PackageTransaction) => void> = new Set();

  constructor(options?: {
    gateway?: PaymentGatewayAdapter;
    packages?: UpgradePackage[];
  }) {
    this.gateway = options?.gateway ?? new SandboxGatewayAdapter();
    this.packages = options?.packages ?? [...DEFAULT_UPGRADE_PACKAGES];
  }

  getPackages(): UpgradePackage[] {
    return [...this.packages];
  }

  getPackage(packageId: PackageId | string): UpgradePackage | undefined {
    return this.packages.find((p) => p.id === packageId);
  }

  async purchasePackage(
    packageId: PackageId | string,
    options?: { userId?: string },
  ): Promise<PackageTransaction> {
    const pkg = this.getPackage(packageId);
    if (!pkg) {
      throw new Error(`Package "${packageId}" not found in catalog`);
    }

    const now = new Date().toISOString();
    const txnId = `txn_${Date.now()}_${pkg.id}`;

    // Step 1: Initiated
    let txn: PackageTransaction = {
      transactionId: txnId,
      packageId: pkg.id,
      userId: options?.userId ?? '',
      amount: pkg.price,
      currency: pkg.currency,
      status: 'initiated',
      gateway: this.gateway.gatewayName,
      receipt: '',
      startedAt: now,
    };
    this.record(txn);

    // Step 2: Processing via Gateway
    const result = await this.gateway.requestPayment(pkg, options);

    if (!result.success) {
      txn = {
        ...txn,
        status: result.status,
        receipt: result.receipt,
        completedAt: new Date().toISOString(),
        errorReason: result.errorReason,
      };
      this.record(txn);
      return txn;
    }

    // Step 3: Verification
    const isValid = await this.gateway.verifyReceipt(result.receipt, {
      transactionId: txnId,
    });
    if (!isValid) {
      txn = {
        ...txn,
        status: 'failed',
        receipt: result.receipt,
        completedAt: new Date().toISOString(),
        errorReason: 'Receipt validation failed',
      };
      this.record(txn);
      return txn;
    }

    // Step 4: Verified
    txn = {
      ...txn,
      status: 'verified',
      receipt: result.receipt,
      completedAt: new Date().toISOString(),
    };
    this.record(txn);
    return txn;
  }

  async restorePurchases(options?: {
    userId?: string;
  }): Promise<PackageTransaction[]> {
    return this.history.filter(
      (t) =>
        t.status === 'verified' &&
        (!options?.userId || t.userId === options.userId),
    );
  }

  getHistory(): PackageTransaction[] {
    return [...this.history];
  }

  getTransaction(transactionId: string): PackageTransaction | undefined {
    return this.history.find((t) => t.transactionId === transactionId);
  }

  subscribe(listener: (txn: PackageTransaction) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private record(txn: PackageTransaction): void {
    const idx = this.history.findIndex((t) => t.transactionId === txn.transactionId);
    if (idx >= 0) {
      this.history[idx] = txn;
    } else {
      this.history.push(txn);
    }
    this.listeners.forEach((fn) => {
      try {
        fn(txn);
      } catch {
        // Suppress listener error
      }
    });
  }
}
