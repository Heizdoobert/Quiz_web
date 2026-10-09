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
      theme: buildAppTheme(),
      home: const QuizScreen(),
    );
  }
}
