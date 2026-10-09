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
  static const String baseUrl = 'http://10.0.2.2:3000/api/mobile/v1'; // Android Emulator alias to localhost
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<String?> getToken() async {
    return await _storage.read(key: 'jwt_token');
  }

  Future<void> saveToken(String token) async {
    await _storage.write(key: 'jwt_token', value: token);
  }

  Future<void> clearToken() async {
    await _storage.delete(key: 'jwt_token');
  }

  Future<Map<String, dynamic>> post(String endpoint, Object body) async {
    final token = await getToken();
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final response = await http.post(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
      body: jsonEncode(body),
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else {
      throw _failure(response);
    }
  }

  Future<Map<String, dynamic>> get(String endpoint) async {
    final token = await getToken();
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };

    final response = await http.get(
      Uri.parse('$baseUrl$endpoint'),
      headers: headers,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body);
    } else {
      throw _failure(response);
    }
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
