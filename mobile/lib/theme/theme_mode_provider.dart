import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provides the current [ThemeMode] and allows toggling between light and dark.
/// Uses Riverpod's `StateNotifier` for mutable state.
class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.system);

  /// Switch to a specific mode.
  void setMode(ThemeMode mode) => state = mode;

  /// Toggle between light and dark. System mode falls back to light.
  void toggle(bool isDark) => state = isDark ? ThemeMode.dark : ThemeMode.light;
}

/// Exposes the notifier to the app.
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, ThemeMode>(
  (ref) => ThemeModeNotifier(),
);
