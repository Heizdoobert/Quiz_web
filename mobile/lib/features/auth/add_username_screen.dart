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
    return Scaffold(
      appBar: AppBar(title: const Text('Add Username')),
      body: const Center(child: Text('Add your username here')),
    );
  }
}
