/// Apple Sign‑In support (iOS only) – placeholder implementation.
///
/// The real implementation would use `SignInWithApple` from the
/// `sign_in_with_apple` package and convert the Apple ID token into a
/// `UserSession`. This stub is provided so the SDK compiles on all
/// platforms, and developers can replace it with a proper
/// implementation.

library auth_sdk.apple;

import '../models/models.dart';
import '../storage/token_storage.dart';

/// Perform Apple Sign‑In and return a `UserSession`.
///
/// Currently throws an `AuthException` indicating that the feature is
/// not implemented. Replace the body with a call to the actual Apple
/// SDK when you add the dependency.
Future<UserSession> signInWithApple({
  required TokenStorage storage,
}) async {
  throw const AuthException(
    'not_implemented',
    'Apple Sign‑In is not implemented in this stub. Add the `sign_in_with_apple` package and implement the flow.',
  );
}
