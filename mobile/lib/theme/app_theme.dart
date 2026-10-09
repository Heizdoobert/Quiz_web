import 'package:flutter/material.dart';

/// Design tokens mirrored from the web app (app/globals.css). Keep in sync.
class AppColors {
  static const deepSpace = Color(0xFF0A1128);
  static const cyberViolet = Color(0xFF1A1B35);
  static const cyberVioletLight = Color(0xFF25284D);
  static const cyberBorder = Color(0xFF2D305A);
  static const elevation2 = Color(0xFF14163A);
  static const neoMint = Color(0xFF00FFCC);
  static const electricIndigo = Color(0xFF6C5CE7);
  static const cryptoGold = Color(0xFFFFD166);
  static const popCoral = Color(0xFFFF4757);
  static const catDefi = Color(0xFF8A2BE2);
  static const catNft = Color(0xFFFF007F);
  static const catL1 = Color(0xFF3071FF);
  static const foreground = Color(0xFFF8FAFC);
  static const slate200 = Color(0xFFE2E8F0);
  static const slate300 = Color(0xFFCBD5E1);
  static const slate400 = Color(0xFF94A3B8);
  static const slate500 = Color(0xFF64748B);

  /// Same keyword rules as getCategoryBadge in hooks/quiz/use-question-front.ts.
  static Color forCategory(String? category) {
    final lower = (category ?? '').toLowerCase();
    if (lower.contains('defi')) return catDefi;
    if (lower.contains('nft') || lower.contains('game')) return catNft;
    if (lower.contains('layer') || lower.contains('web3') || lower.contains('crypto')) return catL1;
    return neoMint;
  }
}

/// The web's `bg-linear-to-r from-neo-mint to-electric-indigo`.
const brandGradient = LinearGradient(colors: [AppColors.neoMint, AppColors.electricIndigo]);

/// The web's heading face is JetBrains Mono; not bundled, so use the platform monospace.
const headingFont = 'monospace';

ThemeData buildAppTheme() {
  final base = ThemeData(
    brightness: Brightness.dark,
    useMaterial3: true,
    colorScheme: const ColorScheme.dark(
      primary: AppColors.neoMint,
      onPrimary: AppColors.deepSpace,
      secondary: AppColors.electricIndigo,
      error: AppColors.popCoral,
      surface: AppColors.cyberViolet,
      onSurface: AppColors.foreground,
    ),
    scaffoldBackgroundColor: AppColors.deepSpace,
  );
  return base.copyWith(
    appBarTheme: const AppBarTheme(
      backgroundColor: AppColors.deepSpace,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    textTheme: base.textTheme.apply(
      bodyColor: AppColors.slate200,
      displayColor: AppColors.foreground,
    ),
    snackBarTheme: const SnackBarThemeData(
      backgroundColor: AppColors.elevation2,
      contentTextStyle: TextStyle(color: AppColors.slate200),
      behavior: SnackBarBehavior.floating,
    ),
  );
}
