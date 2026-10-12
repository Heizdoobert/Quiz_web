import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../api/api_client.dart';

final remoteConfigServiceProvider = Provider((ref) => RemoteConfigService());

/// Fetches when first read. The first screen that uses a value decides when to refetch.
final remoteConfigProvider = FutureProvider<RemoteConfig>(
  (ref) => ref.watch(remoteConfigServiceProvider).fetch(),
);

/// The built-in values: used until the server answers, and whenever it cannot.
/// Mirror every key of sdk/remote_config/keys.ts here with the same default.
class RemoteConfig {
  const RemoteConfig({this.maintenanceMode = false});

  final bool maintenanceMode;
}

class RemoteConfigService {
  RemoteConfigService({http.Client? client, String? baseUrl})
      : _client = client ?? http.Client(),
        _url = Uri.parse('${_origin(baseUrl ?? ApiClient.baseUrl)}/config');

  final http.Client _client;
  final Uri _url;

  // The route is shared with the web, so it sits at /api/config, next to /api/mobile/v1.
  static String _origin(String baseUrl) => baseUrl.replaceFirst(RegExp(r'/mobile/v1$'), '');

  /// The server's values, or the defaults when the request fails, times out, answers a
  /// non-200, or sends something unexpected. Never throws: the app must work offline.
  Future<RemoteConfig> fetch() async {
    try {
      final response = await _client.get(_url).timeout(const Duration(seconds: 5));
      if (response.statusCode != 200) return const RemoteConfig();
      final config = (jsonDecode(response.body) as Map)['config'] as Map;
      final maintenance = config['maintenance_mode'];
      return RemoteConfig(maintenanceMode: maintenance is bool ? maintenance : false);
    } catch (e) {
      debugPrint('Remote config unavailable, using defaults: $e');
      return const RemoteConfig();
    }
  }
}
