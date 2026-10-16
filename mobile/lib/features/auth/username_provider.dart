import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Holds the chosen username locally after the user sets it.
final usernameProvider = StateProvider<String?>((ref) => null);
