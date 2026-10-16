import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/app_theme.dart';
import '../../widgets/glass_card.dart';
import 'auth_provider.dart';
import 'auth_screen.dart';



/// Screen that appears after a successful sign‑up to let the user choose a username.
class AddUsernameScreen extends ConsumerStatefulWidget {
  const AddUsernameScreen({super.key});

  @override
  ConsumerState<AddUsernameScreen> createState() => _AddUsernameScreenState();
}

class _AddUsernameScreenState extends ConsumerState<AddUsernameScreen> {
  final _usernameController = TextEditingController();

  @override
  void dispose() {
    _usernameController.dispose();
    super.dispose();
  }

  void _submit() async {
    final username = _usernameController.text.trim();
    if (username.isEmpty) return;
    // Call the notifier to set the username on the backend.
    await ref.read(authProvider.notifier).setUsername(username);
    // Store locally.

    if (mounted) {
      Navigator.of(context).pop();
    }
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
      appBar: AppBar(backgroundColor: Colors.transparent),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: GlassCard(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: BrandMark(size: 28)),
                  const SizedBox(height: 24),
                  const Text(
                    'Choose a username',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _usernameController,
                    enabled: !auth.isLoading,
                    autocorrect: false,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                    decoration: _field('Username', Icons.person_outline),
                  ),
                  const SizedBox(height: 16),
                  GradientButton(
                    label: 'Save',
                    loading: auth.isLoading,
                    onPressed: _submit,
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
