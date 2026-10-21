import 'package:flutter_riverpod/legacy.dart';

/// Holds the chosen username locally after the user sets it.
final usernameProvider = StateProvider<String?>((ref) => null);
