# SDK Transaction Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Universal SDK Transaction Manager for package upgrades across Dart and TypeScript in `sdk/`, integrated with the Flutter mobile client.

**Architecture:** A state-machine driven transaction manager with pluggable payment gateway adapters (featuring a built-in sandbox adapter for instant dev/testing/demo), universal data models in `sdk/`, and reactive binding to mobile `tierProvider` for automatic Pro tier elevation.

**Tech Stack:** Dart SDK, TypeScript SDK (tsup/tsc), Flutter (Riverpod), and MockClient testing.

**Spec:** [`docs/superpowers/specs/2026-10-22-sdk-transaction-manager-upgrade-package-design.md`](file:///mnt/second_drive/web_quiz/docs/superpowers/specs/2026-10-22-sdk-transaction-manager-upgrade-package-design.md)

## Global Constraints

- All core SDK code MUST reside in the `sdk/` directory (`sdk/dart` and `sdk/src`).
- Standard packages: `pro_monthly` ($4.99/mo), `pro_annual` ($39.99/yr, Best Value), `pro_lifetime` ($79.99 one-time).
- Must support idempotent transaction IDs, receipt verification, and purchase restoration.
- 0 warnings in `flutter analyze` and `npm --prefix sdk run type-check`.
- All tests must pass cleanly.

---

### Task 1: Dart SDK Models & Transaction Manager in `sdk/dart`

**Files:**
- Create: `sdk/dart/lib/src/transactions.dart`
- Modify: `sdk/dart/lib/src/models.dart`
- Modify: `sdk/dart/lib/src/client.dart`
- Modify: `sdk/dart/lib/quickquiz_sdk.dart`
- Test: `sdk/dart/test/transactions_test.dart`

**Interfaces:**
- Consumes: `HttpClient` from `sdk/dart/lib/src/http.dart`.
- Produces: `UpgradePackage`, `PackageTransaction`, `TransactionStatus`, `PaymentGatewayAdapter`, `SandboxGatewayAdapter`, `TransactionManager`, and `c.transactions` on `QuickQuizClient`.

- [ ] **Step 1: Write the failing tests in `sdk/dart/test/transactions_test.dart`**
  Cover package catalog loading, sandbox successful purchase, receipt verification, card declined failure, and purchase restoration.
- [ ] **Step 2: Run `cd sdk/dart && dart test` and confirm test fails**
- [ ] **Step 3: Implement data models in `sdk/dart/lib/src/models.dart`**
- [ ] **Step 4: Implement `TransactionManager` & `SandboxGatewayAdapter` in `sdk/dart/lib/src/transactions.dart`**
- [ ] **Step 5: Expose `transactions` on `QuickQuizClient` and in `quickquiz_sdk.dart`**
- [ ] **Step 6: Run `cd sdk/dart && dart test` and verify all tests pass**
- [ ] **Step 7: Commit Task 1**

---

### Task 2: TypeScript SDK Types & Transaction Manager in `sdk/src`

**Files:**
- Create: `sdk/src/client/transactions.ts`
- Modify: `sdk/src/types.ts`
- Modify: `sdk/src/client/client.ts`
- Modify: `sdk/src/client/index.ts`
- Modify: `sdk/src/index.ts`

**Interfaces:**
- Consumes: `HttpClient` from `sdk/src/client/http.ts`.
- Produces: TypeScript `UpgradePackage`, `PackageTransaction`, `TransactionManager`, `SandboxGatewayAdapter`, and `client.transactions`.

- [ ] **Step 1: Add types to `sdk/src/types.ts`**
- [ ] **Step 2: Implement `TransactionManager` & `SandboxGatewayAdapter` in `sdk/src/client/transactions.ts`**
- [ ] **Step 3: Mount `transactions` on `QuickQuizClient` and export in `sdk/src/index.ts`**
- [ ] **Step 4: Run `npm --prefix sdk run type-check && npm --prefix sdk run build` and verify clean build**
- [ ] **Step 5: Commit Task 2**

---

### Task 3: Mobile Service Integration with Riverpod & Tier Elevation

**Files:**
- Create: `mobile/lib/services/transactions/package_transaction_manager.dart`
- Test: `mobile/test/package_transaction_manager_test.dart`

**Interfaces:**
- Consumes: `TransactionManager` from `sdk/dart`, `tierProvider` from `mobile/lib/services/tier/tier_provider.dart`.
- Produces: `packageTransactionManagerProvider` and `PackageTransactionState`.

- [ ] **Step 1: Write unit tests in `mobile/test/package_transaction_manager_test.dart`**
  Verify successful purchase triggers `tierProvider.notifier.upgradeToPro()`, failed purchase does not alter tier, and packages can be fetched.
- [ ] **Step 2: Run test and confirm failure**
- [ ] **Step 3: Implement `PackageTransactionManager` and Riverpod provider**
- [ ] **Step 4: Re-run tests and confirm green**
- [ ] **Step 5: Commit Task 3**

---

### Task 4: Interactive Pro Upgrade Modal UI (`mobile/`)

**Files:**
- Modify: `mobile/lib/widgets/upgrade_pro_modal.dart`
- Test: `mobile/test/upgrade_pro_modal_test.dart`

**Interfaces:**
- Consumes: `packageTransactionManagerProvider`, `tierProvider`.
- Produces: Interactive package selection cards (Monthly, Annual, Lifetime) with live purchase execution and feedback.

- [ ] **Step 1: Write widget test for modal package selection & purchase trigger**
- [ ] **Step 2: Update `upgrade_pro_modal.dart` with package selection cards and purchase button**
- [ ] **Step 3: Run `mobile/test/upgrade_pro_modal_test.dart` and confirm passing**
- [ ] **Step 4: Commit Task 4**

---

### Task 5: End-to-End Verification & Build

**Files:**
- All touched files.

- [ ] **Step 1: Run all Dart SDK tests (`cd sdk/dart && dart test`)**
- [ ] **Step 2: Run TypeScript SDK type check and build (`npm --prefix sdk run type-check && npm --prefix sdk run build`)**
- [ ] **Step 3: Run `flutter analyze` in `mobile/` and verify 0 issues**
- [ ] **Step 4: Run full `flutter test` in `mobile/` and verify all tests pass**
- [ ] **Step 5: Final review and summary to user**
