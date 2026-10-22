import { describe, it, expect, beforeEach } from 'vitest';
import {
  TransactionManager,
  SandboxGatewayAdapter,
  DEFAULT_UPGRADE_PACKAGES,
  QuickQuizClient,
} from '../src';

describe('TransactionManager (TypeScript SDK)', () => {
  let manager: TransactionManager;

  beforeEach(() => {
    manager = new TransactionManager({
      gateway: new SandboxGatewayAdapter({ latencyMs: 0 }),
    });
  });

  it('retrieves default upgrade packages', () => {
    const packages = manager.getPackages();
    expect(packages).toHaveLength(3);
    expect(packages.map((p) => p.id)).toEqual([
      'pro_monthly',
      'pro_annual',
      'pro_lifetime',
    ]);

    const annual = manager.getPackage('pro_annual');
    expect(annual?.price).toBe(39.99);
    expect(annual?.interval).toBe('year');
    expect(annual?.savingsPercentage).toBe(33);
  });

  it('completes a successful sandbox package upgrade', async () => {
    const txn = await manager.purchasePackage('pro_annual', {
      userId: 'test_user_1',
    });

    expect(txn.packageId).toBe('pro_annual');
    expect(txn.userId).toBe('test_user_1');
    expect(txn.amount).toBe(39.99);
    expect(txn.currency).toBe('USD');
    expect(txn.status).toBe('verified');
    expect(txn.gateway).toBe('sandbox');
    expect(txn.receipt).toContain('sandbox_rcpt_pro_annual');
    expect(txn.completedAt).toBeDefined();

    // Verify history tracking
    const history = manager.getHistory();
    expect(history.find((t) => t.transactionId === txn.transactionId)).toBeDefined();
  });

  it('handles simulated card declined failure from gateway', async () => {
    const failingManager = new TransactionManager({
      gateway: new SandboxGatewayAdapter({
        shouldFail: true,
        failureReason: 'Card expired or insufficient balance',
        latencyMs: 0,
      }),
    });

    const txn = await failingManager.purchasePackage('pro_monthly', {
      userId: 'test_user_2',
    });

    expect(txn.status).toBe('failed');
    expect(txn.errorReason).toBe('Card expired or insufficient balance');
    expect(txn.completedAt).toBeDefined();
  });

  it('handles user cancellation from gateway', async () => {
    const cancellingManager = new TransactionManager({
      gateway: new SandboxGatewayAdapter({
        shouldCancel: true,
        latencyMs: 0,
      }),
    });

    const txn = await cancellingManager.purchasePackage('pro_lifetime', {
      userId: 'test_user_3',
    });

    expect(txn.status).toBe('cancelled');
    expect(txn.errorReason).toContain('cancelled');
  });

  it('restores previous verified purchases for a user', async () => {
    await manager.purchasePackage('pro_annual', { userId: 'alice' });

    const restored = await manager.restorePurchases({ userId: 'alice' });
    expect(restored).toHaveLength(1);
    expect(restored[0].packageId).toBe('pro_annual');
    expect(restored[0].status).toBe('verified');

    // Different user should have no purchases
    const bobRestored = await manager.restorePurchases({ userId: 'bob' });
    expect(bobRestored).toHaveLength(0);
  });

  it('attaches transactions manager to QuickQuizClient instance', () => {
    const client = new QuickQuizClient({ baseUrl: 'https://test.quickquiz.app/api' });
    expect(client.transactions).toBeDefined();
    expect(client.transactions.getPackages()).toHaveLength(3);
  });
});
