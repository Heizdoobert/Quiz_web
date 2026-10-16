import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/widgets/legal_links.dart';

void main() {
  test('the policy and deletion pages live on the API host, not under the API path', () {
    expect(legalUrl('/privacy').toString(), 'http://10.0.2.2:3000/privacy');
    expect(legalUrl('/account-deletion').toString(), 'http://10.0.2.2:3000/account-deletion');
  });

  testWidgets('shows both links', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: Scaffold(body: LegalLinks())));

    expect(find.text('Privacy policy'), findsOneWidget);
    expect(find.text('Delete your account'), findsOneWidget);
  });
}
