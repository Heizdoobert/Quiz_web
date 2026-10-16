import 'package:mobile/api/api_client.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';

/// A thin repository that abstracts authentication logic.
/// It checks if a token exists, validates it via a simple API call
/// (you can replace `/auth/validate` with your real endpoint), and
/// stores/clears the token.
class AuthRepository {
  final ApiClient _apiClient;
  final SecureStorageService _storage;

  AuthRepository(this._apiClient, this._storage);

  /// Returns true if a token is present and the server confirms it.
  Future<bool> isTokenValid() async {
    final token = await _storage.readToken();
    if (token == null) return false;
    try {
      // Assuming the backend has an endpoint that validates the token.
      final res = await _apiClient.get('/auth/validate');
      // If the call succeeds, we consider the token valid.
      return true;
    } on ApiException catch (_) {
      // Invalid token or server error.
      return false;
    }
  }

  Future<void> saveToken(String token) async {
    await _storage.writeToken(token);
  }

  Future<String?> readToken() async {
    return await _storage.readToken();
  }

  Future<void> clearToken() async {
    await _storage.deleteToken();
  }


}
