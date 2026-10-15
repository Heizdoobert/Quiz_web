// Widget test for SettingsScreen
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/settings/settings_screen.dart';

void main() {
  testWidgets('SettingsScreen placeholder displays', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: SettingsScreen()));
    expect(find.text('Settings Screen Placeholder'), findsOneWidget);
    expect(find.byType(AppBar), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });
}
