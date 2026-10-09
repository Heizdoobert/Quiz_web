import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/quiz/quiz_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: QuickQuizApp()));
}

/// Opens straight onto the quiz, as a guest. Signing in is asked for only when the player
/// answers or connects (see requireSignIn).
class QuickQuizApp extends StatelessWidget {
  const QuickQuizApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quick Quiz',
      debugShowCheckedModeBanner: false,
<<<<<<< HEAD
      title: 'Quick Quiz',
      theme: AppTheme.theme,
      home: authState.isLoading
          ? const Scaffold(body: Center(child: CircularProgressIndicator(color: AppTheme.neoMint)))
          : (authState.isAuthenticated ? const QuizScreen() : const LoginScreen()),
=======
      theme: buildAppTheme(),
      home: const QuizScreen(),
>>>>>>> feat/mobile-ui-parity
    );
  }
}
