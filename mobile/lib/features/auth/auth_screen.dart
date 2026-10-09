import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import 'auth_provider.dart';

/// Mirrors the web's auth popup: Google, or a username and password. No wallet here;
/// the quiz asks for one when the player first answers.
class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({super.key});

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _username = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;

  @override
  void dispose() {
    _username.dispose();
    _password.dispose();
    super.dispose();
  }

  void _submit() {
    ref.read(authProvider.notifier).signInWithPassword(_username.text, _password.text, signUp: _signUp);
  }

  InputDecoration _field(String label, IconData icon) {
    OutlineInputBorder border(Color color) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: color),
        );
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, size: 20, color: AppColors.slate400),
      filled: true,
      fillColor: AppColors.deepSpace.withValues(alpha: 0.6),
      border: border(AppColors.cyberBorder),
      enabledBorder: border(AppColors.cyberBorder),
      focusedBorder: border(AppColors.neoMint),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              padding: const EdgeInsets.all(28),
              child: AutofillGroup(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: BrandMark(size: 28)),
                    const SizedBox(height: 24),
                    const Text(
                      'Ready to play?',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 0.5),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Sign in to save your progress and earn rewards.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 14, color: AppColors.slate400),
                    ),
                    const SizedBox(height: 24),
                    TextField(
                      controller: _username,
                      enabled: !auth.isLoading,
                      autocorrect: false,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.username],
                      decoration: _field('Username', Icons.person_outline),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _password,
                      enabled: !auth.isLoading,
                      obscureText: true,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _submit(),
                      autofillHints: [_signUp ? AutofillHints.newPassword : AutofillHints.password],
                      decoration: _field('Password', Icons.lock_outline),
                    ),
                    if (auth.error != null) ...[
                      const SizedBox(height: 12),
                      Text(auth.error!, style: const TextStyle(color: AppColors.popCoral, fontSize: 13)),
                    ],
                    const SizedBox(height: 16),
                    GradientButton(
                      label: _signUp ? 'Create Account' : 'Sign In',
                      loading: auth.isLoading,
                      onPressed: _submit,
                    ),
                    TextButton(
                      onPressed: auth.isLoading ? null : () => setState(() => _signUp = !_signUp),
                      child: Text(
                        _signUp ? 'Already have an account? Sign in' : 'New here? Create an account',
                        style: const TextStyle(color: AppColors.neoMint),
                      ),
                    ),
                    const Row(
                      children: [
                        Expanded(child: Divider(color: AppColors.cyberBorder)),
                        Padding(
                          padding: EdgeInsets.symmetric(horizontal: 12),
                          child: Text('or', style: TextStyle(color: AppColors.slate500, fontSize: 12)),
                        ),
                        Expanded(child: Divider(color: AppColors.cyberBorder)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: auth.isLoading ? null : () => ref.read(authProvider.notifier).signInWithGoogle(),
                      icon: const Icon(Icons.g_mobiledata, size: 28),
                      label: const Text('Continue with Google'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: AppColors.cyberBorder),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
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
