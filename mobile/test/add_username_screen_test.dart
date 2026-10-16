import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart';
import 'package:mobile/features/auth/add_username_screen.dart';

void main() {
  testWidgets('AddUsernameScreen displays placeholder', (WidgetTester tester) async {
    // Build the widget inside a MaterialApp to provide Navigator and Theme
    await tester.pumpWidget(const MaterialApp(
      home: AddUsernameScreen(),
    ));

    // Verify AppBar title is present
    expect(find.text('Add Username'), findsOneWidget);
    // Verify the placeholder body text is present
    expect(find.text('Add your username here'), findsOneWidget);
  });
}
