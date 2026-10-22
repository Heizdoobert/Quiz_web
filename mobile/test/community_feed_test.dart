import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/features/community/community_feed_screen.dart';

void main() {
  testWidgets('CommunityFeedScreen displays public friend quizzes and topic filters', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: CommunityFeedScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Community Quizzes'), findsOneWidget);
    expect(find.text('All'), findsOneWidget);
    expect(find.text('Web3'), findsWidgets);
    expect(find.text('DeFi'), findsWidgets);
    expect(find.text('Crypto'), findsWidgets);

    // Verify mock community quizzes render
    expect(find.text('Ethereum Layer 2 & Rollups Deep Dive'), findsOneWidget);
    expect(find.text('By AlexCrypto'), findsOneWidget);
    expect(find.text('DeFi Lending & Liquidity Pools'), findsOneWidget);
    expect(find.text('By SarahDeFi'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Play Friend Quiz'), findsNWidgets(3));
  });

  testWidgets('Tapping topic filter chip filters community feed list', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: CommunityFeedScreen()),
      ),
    );
    await tester.pumpAndSettle();

    // Tap 'DeFi' filter chip
    await tester.tap(find.widgetWithText(FilterChip, 'DeFi'));
    await tester.pumpAndSettle();

    // Now only DeFi quiz is displayed
    expect(find.text('DeFi Lending & Liquidity Pools'), findsOneWidget);
    expect(find.text('Ethereum Layer 2 & Rollups Deep Dive'), findsNothing);
    expect(find.widgetWithText(ElevatedButton, 'Play Friend Quiz'), findsOneWidget);
  });
}
