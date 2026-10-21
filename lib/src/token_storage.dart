// Conditional export: use the file‑based implementation on all platforms except the web, where the HTML implementation is needed.
export 'mobile_token_storage.dart' if (dart.library.html) 'web_token_storage.dart';

import 'models.dart';

/// Abstract token storage used by the SDK.
abstract class TokenStorage {
  /// Persist a [TokenBundle] for the current user.
  Future<void> writeTokens(TokenBundle tokens);

  /// Retrieve the stored [TokenBundle], or null if none exists.
  Future<TokenBundle?> readTokens();

  /// Remove any stored tokens.
  Future<void> clear();
}
