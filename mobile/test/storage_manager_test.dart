import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/storage_manager.dart';

void main() {
  late StorageManager manager;
  const raw = FlutterSecureStorage();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    manager = StorageManager();
  });

  test('round-trips JSON values', () async {
    await manager.write('profile', {'name': 'ada', 'streak': 3});
    expect(await manager.read<Map>('profile'), {'name': 'ada', 'streak': 3});
  });

  test('stores the value compressed, not as plain JSON', () async {
    await manager.write('profile', {'name': 'ada'});
    final stored = await raw.read(key: 'qq.profile');
    expect(stored, isNotNull);
    expect(stored, isNot(contains('ada')));
  });

  test('missing key reads as null', () async {
    expect(await manager.read<String>('nope'), isNull);
  });

  test('a corrupt entry reads as null and is removed', () async {
    await raw.write(key: 'qq.bad', value: 'not-gzip');
    expect(await manager.read<String>('bad'), isNull);
    expect(await raw.read(key: 'qq.bad'), isNull);
  });

  test('clear removes only this namespace', () async {
    await manager.write('a', 1);
    await raw.write(key: 'jwt_token', value: 'keep');
    await manager.clear();
    expect(await manager.read<int>('a'), isNull);
    expect(await raw.read(key: 'jwt_token'), 'keep');
  });
}
