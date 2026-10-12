import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/services/remote_config_service.dart';

void main() {
  RemoteConfigService serviceFor(Future<http.Response> Function(http.Request) handler) =>
      RemoteConfigService(client: MockClient(handler), baseUrl: 'https://quiz.example/api/mobile/v1');

  test('a 200 sets the value', () async {
    final config = await serviceFor((_) async => http.Response('{"config":{"maintenance_mode":true}}', 200)).fetch();
    expect(config.maintenanceMode, true);
  });

  test('asks the shared route on the same origin, not the mobile one', () async {
    Uri? asked;
    await serviceFor((request) async {
      asked = request.url;
      return http.Response('{"config":{"maintenance_mode":false}}', 200);
    }).fetch();
    expect(asked.toString(), 'https://quiz.example/api/config');
  });

  test('a 503 leaves the defaults', () async {
    final config = await serviceFor((_) async => http.Response('{"error":"unavailable"}', 503)).fetch();
    expect(config.maintenanceMode, false);
  });

  test('malformed JSON leaves the defaults', () async {
    final config = await serviceFor((_) async => http.Response('<html>proxy error</html>', 200)).fetch();
    expect(config.maintenanceMode, false);
  });

  test('a network error leaves the defaults', () async {
    final config = await serviceFor((_) async => throw http.ClientException('offline')).fetch();
    expect(config.maintenanceMode, false);
  });

  test('a value of the wrong type leaves the default', () async {
    final config = await serviceFor((_) async => http.Response('{"config":{"maintenance_mode":"yes"}}', 200)).fetch();
    expect(config.maintenanceMode, false);
  });
}
