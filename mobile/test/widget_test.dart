import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/wallet_service.dart';
import 'package:mobile/theme/app_theme.dart';

void main() {
  test('category colors follow the web keyword rules', () {
    expect(AppColors.forCategory('DeFi Basics'), AppColors.catDefi);
    expect(AppColors.forCategory('NFT & Gaming'), AppColors.catNft);
    expect(AppColors.forCategory('Layer 2'), AppColors.catL1);
    expect(AppColors.forCategory(null), AppColors.neoMint);
  });

  test('SIWE message carries the address, chain and nonce the server checks', () {
    final message = buildSiweMessage(address: '0xAbC', chainId: 1, nonce: 'n0nce');
    expect(message, contains('\n0xAbC\n'));
    expect(message, contains('Chain ID: 1\n'));
    expect(message, contains('Nonce: n0nce\n'));
    expect(message, contains('Expiration Time: '));
  });

  testWidgets('theme is dark on the deep-space background', (tester) async {
    final theme = buildAppTheme();
    expect(theme.brightness, Brightness.dark);
    expect(theme.scaffoldBackgroundColor, AppColors.deepSpace);
    await tester.pumpWidget(MaterialApp(theme: theme, home: const Scaffold(body: Text('ok'))));
    expect(find.text('ok'), findsOneWidget);
  });
}
