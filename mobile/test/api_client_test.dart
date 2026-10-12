import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/api/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final unauthorized = MockClient((_) async => http.Response('{"error":"Unauthorized"}', 401));

  test('a 401 on a request that carried the token reports the session as over', () async {
    FlutterSecureStorage.setMockInitialValues({'jwt_token': 'expired'});
    var calls = 0;
    final api = ApiClient(client: unauthorized, onUnauthorized: () => calls++);

    await expectLater(
      api.post('/quiz/sync', const []),
      throwsA(isA<ApiException>().having((e) => e.status, 'status', 401)),
    );
    expect(calls, 1);
  });

  test('a 401 without a token (wrong password) is not a session expiry', () async {
    FlutterSecureStorage.setMockInitialValues({});
    var calls = 0;
    final api = ApiClient(client: unauthorized, onUnauthorized: () => calls++);

    await expectLater(api.post('/auth/password', const {}), throwsA(isA<ApiException>()));
    expect(calls, 0);
  });

  test('the stored token goes out as a Bearer header', () async {
    FlutterSecureStorage.setMockInitialValues({'jwt_token': 'good'});
    String? sent;
    final api = ApiClient(
      client: MockClient((request) async {
        sent = request.headers['Authorization'];
        return http.Response('{"ok":true}', 200);
      }),
    );

    expect(await api.get('/quiz/board'), {'ok': true});
    expect(sent, 'Bearer good');
  });
}
