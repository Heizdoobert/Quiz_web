import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/groups/challenge_group_screen.dart';
import 'package:mobile/services/tier/tier_provider.dart';

void main() {
  testWidgets('ChallengeGroupScreen displays active challenge arenas and group details', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: ChallengeGroupScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Challenge Groups'), findsOneWidget);
    expect(find.text('Active Challenger Arenas'), findsOneWidget);
    expect(find.text('Top 1% Flutter Architects'), findsOneWidget);
    expect(find.text('Web3 & DeFi Speedrunners'), findsOneWidget);
    await tester.scrollUntilVisible(find.text('System Design Arena'), 100);
    expect(find.text('System Design Arena'), findsOneWidget);
    expect(find.text('Open Group'), findsOneWidget);
  });

  testWidgets('Tapping View Group Leaderboard shows group ranks and scores', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: ChallengeGroupScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final viewLeaderboardBtn = find.byKey(const Key('view_group_grp-1'));
    expect(viewLeaderboardBtn, findsOneWidget);

    await tester.tap(viewLeaderboardBtn);
    await tester.pumpAndSettle();

    expect(find.text('Top 1% Flutter Architects Leaderboard'), findsOneWidget);
    expect(find.text('2.0x Challenger Rank Multiplier Active'), findsOneWidget);
    expect(find.text('DartMaster'), findsOneWidget);
    expect(find.text('3420 pts'), findsOneWidget);
  });

  testWidgets('Guest or Free player tapping Open Group triggers Pro Upgrade Modal', (WidgetTester tester) async {
    final container = ProviderContainer();
    // Default is guest tier
    expect(container.read(tierProvider).isPro, isFalse);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: ChallengeGroupScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tapping FAB
    final fab = find.byKey(const Key('open_group_fab'));
    await tester.tap(fab);
    await tester.pumpAndSettle();

    // Pro Upgrade Modal should be shown
    expect(find.text('Unlock Pro Package'), findsOneWidget);
    expect(find.text('Open Challenge Groups'), findsOneWidget);
    expect(find.text('Choose Your Plan'), findsOneWidget);
    expect(find.byKey(const Key('purchase_package_button')), findsOneWidget);
  });

  testWidgets('Pro player can create a new challenge group and see it in list', (WidgetTester tester) async {
    final container = ProviderContainer();
    // Upgrade to Pro
    container.read(tierProvider.notifier).upgradeToPro();
    expect(container.read(tierProvider).isPro, isTrue);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: ChallengeGroupScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Pro banner active
    expect(find.text('👑 Pro Challenger Active'), findsOneWidget);

    // Tap Open Group FAB
    final fab = find.byKey(const Key('open_group_fab'));
    await tester.tap(fab);
    await tester.pumpAndSettle();

    // Creation dialog opens
    expect(find.text('Open Challenge Group'), findsOneWidget);

    // Enter title
    await tester.enterText(find.byKey(const Key('group_title_field')), 'DeFi Alpha Arena');
    await tester.enterText(find.byKey(const Key('group_desc_field')), 'High stakes DeFi test');
    await tester.pump();

    // Tap submit
    await tester.tap(find.byKey(const Key('create_group_submit_button')));
    await tester.pumpAndSettle();

    // Group should now appear in the list
    expect(find.text('DeFi Alpha Arena'), findsOneWidget);
    expect(find.text('High stakes DeFi test'), findsOneWidget);
  });
}
