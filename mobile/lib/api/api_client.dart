import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// A non-2xx answer from the server, with its `error` text when it sent one.
class ApiException implements Exception {
  ApiException(this.status, this.message);

  final int status;
  final String message;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({http.Client? client, this.onUnauthorized}) : _client = client ?? http.Client();

  // Pass --dart-define=API_BASE_URL=https://<host>/api/mobile/v1 for a real device or a release
  // build. The default is the Android emulator's alias for the host's localhost.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api/mobile/v1',
  );
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final http.Client _client;

  /// Called when the server rejects the stored token (expired or revoked). Not called for a
  /// 401 on a request sent without a token, such as a wrong password at sign-in.
  final void Function()? onUnauthorized;

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: 'jwt_token');
  }

  /// The account that last signed in on this device. Kept after the token expires, so the
  /// queued answers can be matched to whoever signs in next.
  Future<String?> getAccountId() => _storage.read(key: 'account_id');

  Future<void> saveAccountId(String id) => _storage.write(key: 'account_id', value: id);

  Future<void> clearAccountId() => _storage.delete(key: 'account_id');

  Future<Map<String, dynamic>> post(String endpoint, Object body) {
    return _send((headers) => _client.post(
          Uri.parse('$baseUrl$endpoint'),
          headers: headers,
          body: jsonEncode(body),
        ));
  }

  Future<Map<String, dynamic>> get(String endpoint) {
    return _send((headers) => _client.get(Uri.parse('$baseUrl$endpoint'), headers: headers));
  }

  Future<Map<String, dynamic>> _send(
    Future<http.Response> Function(Map<String, String> headers) request,
  ) async {
    final token = await getToken();
    final response = await request({
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    });

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    }
    if (response.statusCode == 401 && token != null) onUnauthorized?.call();
    throw _failure(response);
  }

  ApiException _failure(http.Response response) {
    var message = 'Request failed (${response.statusCode})';
    try {
      final error = (jsonDecode(response.body) as Map<String, dynamic>)['error'];
      if (error is String && error.isNotEmpty) message = error;
    } catch (_) {
      // Not JSON (a proxy error page): keep the generic message.
    }
    return ApiException(response.statusCode, message);
  }
}
