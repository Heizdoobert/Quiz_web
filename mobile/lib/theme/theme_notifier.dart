import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';

/// Simple provider to toggle light/dark mode across the app.
final themeModeProvider = StateNotifierProvider<ThemeModeNotifier, bool>((ref) => ThemeModeNotifier());

class ThemeModeNotifier extends StateNotifier<bool> {
  // false = dark (default), true = light
  ThemeModeNotifier() : super(false);

  void toggle() => state = !state;
  void setLight(bool isLight) => state = isLight;
}
