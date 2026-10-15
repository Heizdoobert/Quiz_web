// Widget test for LeaderboardScreen
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/leaderboard/leaderboard_screen.dart';

void main() {
  testWidgets('LeaderboardScreen placeholder displays', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: LeaderboardScreen()));
    expect(find.text('Leaderboard Screen'), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.text('Leaderboard'), findsOneWidget);
  });
}
