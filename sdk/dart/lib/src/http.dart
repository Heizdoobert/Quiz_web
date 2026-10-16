import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'errors.dart';

const _retryable = {500, 502, 503, 504};
const _idempotent = {'GET', 'HEAD', 'PUT', 'DELETE', 'OPTIONS'};

/// Port of the TypeScript `HttpClient`: Bearer token, query encoding, retry with backoff for
/// idempotent calls, and the `{success, data | error}` envelope.
class HttpClient {
  HttpClient({
    required this.baseUrl,
    this.token,
    http.Client? client,
    this.timeout,
    this.retries = 0,
  }) : _client = client ?? http.Client();

  final String baseUrl;
  String? token;
  final Duration? timeout;
  final int retries;
  final http.Client _client;

  Future<dynamic> request(
    String path, {
    String method = 'GET',
    Object? body,
    Map<String, Object?>? query,
    Duration? timeout,
    int? retries,
  }) async {
    final verb = method.toUpperCase();
    final uri = _uri(path, query);
    final maxRetries = (retries ?? this.retries).clamp(0, 10);
    final limit = timeout ?? this.timeout;
    final headers = {
      if (token != null) 'Authorization': 'Bearer $token',
      if (body != null) 'Content-Type': 'application/json',
    };

    for (var attempt = 0;; attempt++) {
      final canRetry = _idempotent.contains(verb) && attempt < maxRetries;
      http.Response response;
      try {
        final send = _send(verb, uri, headers, body);
        response = await (limit == null ? send : send.timeout(limit));
      } on TimeoutException catch (e) {
        throw QuickQuizError('TIMEOUT_ERROR', 'Request timed out', 0, e);
      } catch (e) {
        if (canRetry) {
          await _backoff(attempt);
          continue;
        }
        throw QuickQuizError('NETWORK_ERROR', '$e', 0, e);
      }
      if (canRetry && _retryable.contains(response.statusCode)) {
        await _backoff(attempt);
        continue;
      }
      return _parse(response);
    }
  }

  void close() => _client.close();

  Uri _uri(String path, Map<String, Object?>? query) {
    final base = baseUrl.replaceAll(RegExp(r'/+$'), '');
    final url = Uri.parse('$base${path.startsWith('/') ? path : '/$path'}');
    final params = <String, String>{
      ...url.queryParameters,
      for (final e in (query ?? const <String, Object?>{}).entries)
        if (e.value != null)
          e.key: e.value is List ? (e.value as List).join(',') : '${e.value}',
    };
    return params.isEmpty ? url : url.replace(queryParameters: params);
  }

  Future<http.Response> _send(
      String verb, Uri uri, Map<String, String> headers, Object? body) async {
    final request = http.Request(verb, uri)..headers.addAll(headers);
    if (body != null) request.body = body is String ? body : jsonEncode(body);
    return http.Response.fromStream(await _client.send(request));
  }

  Future<void> _backoff(int attempt) {
    final ms = (100 * (1 << attempt)).clamp(100, 2000);
    return Future<void>.delayed(Duration(milliseconds: ms));
  }

  dynamic _parse(http.Response response) {
    final status = response.statusCode;
    final ok = status >= 200 && status < 300;
    Object? parsed;
    if (response.body.trim().isNotEmpty) {
      try {
        parsed = jsonDecode(response.body);
      } on FormatException {
        final head = response.body.length > 100
            ? response.body.substring(0, 100)
            : response.body;
        throw QuickQuizError(
          ok
              ? 'INVALID_JSON'
              : (status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN_ERROR'),
          'Invalid JSON response: $head',
          status,
          {'raw': response.body},
        );
      }
    }

    if (parsed is Map && parsed.containsKey('success')) {
      if (parsed['success'] == true) return parsed['data'];
      final err = parsed['error'];
      if (err is Map) {
        throw QuickQuizError(
          '${err['code'] ?? 'UNKNOWN_ERROR'}',
          '${err['message'] ?? 'An error occurred'}',
          status,
          err['details'],
        );
      }
      throw QuickQuizError(
          'UNKNOWN_ERROR', err is String ? err : 'An error occurred', status);
    }

    if (!ok) {
      final obj = parsed is Map ? parsed : const {};
      throw QuickQuizError(
        '${obj['code'] ?? (status >= 500 ? 'SERVER_ERROR' : 'HTTP_ERROR')}',
        '${obj['message'] ?? obj['error'] ?? response.reasonPhrase ?? 'HTTP error $status'}',
        status,
        obj['details'] ?? parsed,
      );
    }
    return parsed;
  }
}
