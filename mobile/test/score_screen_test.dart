// Widget test for ScoreScreen
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/score/score_screen.dart';

void main() {
  testWidgets('ScoreScreen placeholder displays', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: ScoreScreen()));
    expect(find.text('Score Screen'), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.text('Score'), findsOneWidget);
  });
}
