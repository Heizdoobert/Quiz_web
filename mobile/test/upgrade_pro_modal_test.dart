import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/widgets/upgrade_pro_modal.dart';
import 'package:mobile/services/tier/tier_provider.dart';
import 'package:mobile/services/transactions/package_transaction_manager.dart';

void main() {
  testWidgets('showUpgradeProModal displays package tiers and features', (WidgetTester tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
        ],
        child: MaterialApp(
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) => ElevatedButton(
                key: const Key('open_modal_btn'),
                onPressed: () => showUpgradeProModal(context, ref),
                child: const Text('Open Modal'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap to open modal
    await tester.tap(find.byKey(const Key('open_modal_btn')));
    await tester.pumpAndSettle();

    expect(find.text('Unlock Pro Package'), findsOneWidget);
    expect(find.text('Pro Monthly'), findsOneWidget);
    expect(find.text('Pro Annual'), findsOneWidget);
    await tester.ensureVisible(find.text('Pro Lifetime VIP'));
    expect(find.text('Pro Lifetime VIP'), findsOneWidget);
    await tester.ensureVisible(find.text('Restore Purchases'));
    expect(find.text('Restore Purchases'), findsOneWidget);
  });

  testWidgets('Selecting a package and tapping purchase initiates transaction and upgrades to Pro', (WidgetTester tester) async {
    final container = ProviderContainer(
      overrides: [
        tierProvider.overrideWith((ref) => TierNotifier(isAuth: false)),
      ],
    );

    expect(container.read(tierProvider).isPro, isFalse);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          home: Scaffold(
            body: Consumer(
              builder: (context, ref, _) => ElevatedButton(
                key: const Key('open_modal_btn'),
                onPressed: () => showUpgradeProModal(context, ref),
                child: const Text('Open Modal'),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Open modal
    await tester.tap(find.byKey(const Key('open_modal_btn')));
    await tester.pumpAndSettle();

    // Tap the Annual Package card
    final annualCard = find.byKey(const Key('package_card_pro_annual'));
    expect(annualCard, findsOneWidget);
    await tester.tap(annualCard);
    await tester.pumpAndSettle();

    final purchaseBtn = find.byKey(const Key('purchase_package_button'));
    await tester.ensureVisible(purchaseBtn);
    await tester.pumpAndSettle();

    expect(purchaseBtn, findsOneWidget);
    await tester.tap(purchaseBtn);
    await tester.pumpAndSettle();

    // Verify tierProvider is now Pro!
    expect(container.read(tierProvider).isPro, isTrue);
  });
}
