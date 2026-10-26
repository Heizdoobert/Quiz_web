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
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _validateToken();
  }

  Future<void> _validateToken() async {
    try {
      final valid = await widget.repository.isTokenValid();
      if (mounted && !_navigated) {
        _navigated = true;
        if (valid) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const QuizScreen()),
          );
        } else {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const AuthScreen()),
          );
        }
      }
    } catch (_) {
      if (mounted && !_navigated) {
        _navigated = true;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AuthScreen()),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Show a loading indicator while token validation is in progress.
    return const Scaffold(body: Center(child: Text('Loading')));
  }
}
