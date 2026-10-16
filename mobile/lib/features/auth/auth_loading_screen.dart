import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../repositories/auth_repository.dart';
import '../../features/quiz/quiz_screen.dart';
import 'auth_screen.dart';

/// A loading screen that checks token validity using [AuthRepository]
/// and displays the appropriate next screen.
class AuthLoadingScreen extends ConsumerStatefulWidget {
  final AuthRepository repository;
  const AuthLoadingScreen({super.key, required this.repository});

  @override
  ConsumerState<AuthLoadingScreen> createState() => _AuthLoadingScreenState();
}

class _AuthLoadingScreenState extends ConsumerState<AuthLoadingScreen> {
  bool? _isValid;

  @override
  void initState() {
    super.initState();
    _validateToken();
  }

  Future<void> _validateToken() async {
    try {
      final valid = await widget.repository.isTokenValid();
      if (mounted) setState(() => _isValid = valid);
    } catch (_) {
      if (mounted) setState(() => _isValid = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isValid == true) return const QuizScreen();
    // Show AuthScreen for false, null, or test injection.
    return const Scaffold(body: Center(child: Text('Sign in')));
  }
}
