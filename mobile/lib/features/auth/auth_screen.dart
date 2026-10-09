import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import 'auth_provider.dart';

/// Mirrors the web's AuthChoiceScreen: "Ready to play?" with a single wallet sign-in.
class AuthScreen extends ConsumerWidget {
  const AuthScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const BrandMark(size: 28),
                  const SizedBox(height: 24),
                  const Text(
                    'Ready to play?',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.5),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Sign in with your wallet to save your progress and earn rewards.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: AppColors.slate400),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: GradientButton(
                      label: 'Connect Wallet',
                      icon: Icons.account_balance_wallet_outlined,
                      loading: auth.isLoading,
                      onPressed: () => ref.read(authProvider.notifier).login(),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// The web header's logo: mint bolt tile beside the gradient "Quick Quiz" wordmark.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 22});

  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.neoMint.withValues(alpha: 0.15),
            border: Border.all(color: AppColors.neoMint.withValues(alpha: 0.4)),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.bolt, size: size, color: AppColors.neoMint),
        ),
        const SizedBox(width: 10),
        ShaderMask(
          shaderCallback: (rect) => brandGradient.createShader(rect),
          child: Text(
            'Quick Quiz',
            style: TextStyle(
              fontFamily: headingFont,
              fontWeight: FontWeight.w900,
              fontSize: size,
              letterSpacing: 1,
              color: Colors.white,
            ),
          ),
        ),
      ],
    );
  }
}
