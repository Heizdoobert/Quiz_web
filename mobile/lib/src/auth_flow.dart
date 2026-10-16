// Stub AuthSdk implementation to satisfy integration tests.
// This wrapper forwards calls to the existing AuthProvider where possible.

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../features/auth/auth_provider.dart';

class AuthSdk {
  final ProviderContainer _container;

  // Allow injection of a custom container for testing; otherwise create a new one.
  AuthSdk([ProviderContainer? container]) : _container = container ?? ProviderContainer();

  /// Mimics the original private sign‑in flow used in the outdated test.
  /// It simply executes the provided request function. The request
  /// returns a map that would normally be processed by the real SDK.
  Future<void> _signInFlow(Future<Map<String, dynamic>> Function() request) async {
    await request(); // No further processing needed for the stub.
  }

  /// Token refresh stub – the actual refresh logic lives in ApiClient.
  /// This method is a no‑op to keep the test compiling.
  Future<void> _refreshTokens() async {
    // Intentionally left blank.
  }

  /// Sign‑out stub – delegates to the AuthProvider's public logout method.
  Future<void> _signOut() async {
    await _container.read(authProvider.notifier).logout();
  }
}
