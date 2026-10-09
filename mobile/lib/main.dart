import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/auth_screen.dart';
import 'features/quiz/quiz_screen.dart';
import 'theme/app_theme.dart';

void main() {
  runApp(const ProviderScope(child: QuickQuizApp()));
}

class QuickQuizApp extends StatelessWidget {
  const QuickQuizApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Quick Quiz',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      home: const _AuthGate(),
    );
  }
}

class _AuthGate extends ConsumerWidget {
  const _AuthGate();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider);
    return auth.isAuthenticated ? const QuizScreen() : const AuthScreen();
  }
}
