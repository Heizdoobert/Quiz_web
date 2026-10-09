import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'features/auth/auth_provider.dart';
import 'features/auth/login_screen.dart';
import 'features/quiz/quiz_screen.dart';

void main() {
  runApp(const ProviderScope(child: MyApp()));
}

class AppTheme {
  static const Color background = Color(0xFF0A1128);
  static const Color foreground = Color(0xFFF8FAFC);
  static const Color cyberViolet = Color(0xFF1A1B35);
  static const Color elevation2 = Color(0xFF14163A);
  static const Color cyberBorder = Color(0xFF2D305A);
  static const Color neoMint = Color(0xFF00FFCC);
  static const Color electricIndigo = Color(0xFF6C5CE7);

  static final ThemeData theme = ThemeData(
    scaffoldBackgroundColor: background,
    brightness: Brightness.dark,
    primaryColor: neoMint,
    colorScheme: const ColorScheme.dark(
      primary: neoMint,
      secondary: electricIndigo,
      surface: cyberViolet,
      background: background,
      onPrimary: background,
      onSurface: foreground,
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: background,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: TextStyle(
        fontFamily: 'monospace',
        color: foreground,
        fontSize: 20,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.2,
      ),
    ),
    cardTheme: CardThemeData(
      color: cyberViolet,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: cyberBorder, width: 1),
      ),
      elevation: 8,
      shadowColor: Colors.black45,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: electricIndigo,
        foregroundColor: foreground,
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        textStyle: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 16,
          letterSpacing: 0.5,
        ),
      ),
    ),
    textTheme: const TextTheme(
      bodyLarge: TextStyle(color: foreground),
      bodyMedium: TextStyle(color: foreground),
      headlineMedium: TextStyle(color: foreground, fontFamily: 'monospace', fontWeight: FontWeight.bold),
      titleLarge: TextStyle(color: foreground, fontWeight: FontWeight.w600),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Web3 Quiz',
      theme: AppTheme.theme,
      home: authState.isLoading
          ? const Scaffold(body: Center(child: CircularProgressIndicator(color: AppTheme.neoMint)))
          : (authState.isAuthenticated ? const QuizScreen() : const LoginScreen()),
    );
  }
}
