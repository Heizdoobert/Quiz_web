import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A thin wrapper around [FlutterSecureStorage] to read/write the authentication token.
///
/// This class isolates the storage implementation from the rest of the code
/// base, making it easy to test and to replace later if needed.
class SecureStorageService {
  static const _tokenKey = 'auth_token';
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  /// Reads the stored token. Returns `null` if no token is present.
  Future<String?> readToken() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (e) {
      // Log the error in production; for now we just rethrow.
      rethrow;
    }
  }

  /// Writes [token] to storage. Overwrites any existing token.
  Future<void> writeToken(String token) async {
    try {
      await _storage.write(key: _tokenKey, value: token);
    } catch (e) {
      rethrow;
    }
  }

  /// Deletes the stored token.
  Future<void> deleteToken() async {
    try {
      await _storage.delete(key: _tokenKey);
    } catch (e) {
      rethrow;
    }
  }
}
