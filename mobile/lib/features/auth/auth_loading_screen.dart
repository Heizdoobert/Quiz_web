import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile/repositories/auth_repository.dart';
import 'package:mobile/features/quiz/quiz_screen.dart';


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
    if (_isValid == true) {
      return const QuizScreen();
    } else if (_isValid == false) {
      // Show placeholder with Sign in text on validation failure.
      return const Scaffold(body: Center(child: Text('Sign in')));
    }
    // Validation in progress.
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }


}
