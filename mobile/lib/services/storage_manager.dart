import 'dart:convert';
import 'dart:io' show gzip;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Keeps small JSON values on the device, gzip-compressed. The OS keystore (Keychain, Android
/// Keystore) encrypts them at rest through flutter_secure_storage, so there is no crypto here.
/// Suited to tokens, settings and short caches, not large blobs.
class StorageManager {
  StorageManager({FlutterSecureStorage? storage, this.namespace = 'qq'})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  final String namespace;

  String _id(String name) => '$namespace.$name';

  Future<void> write(String name, Object? value) => _storage.write(
        key: _id(name),
        value: base64.encode(gzip.encode(utf8.encode(jsonEncode(value)))),
      );

  /// The stored value, or null when absent. An entry that cannot be read is removed.
  Future<T?> read<T>(String name) async {
    final raw = await _storage.read(key: _id(name));
    if (raw == null) return null;
    try {
      return jsonDecode(utf8.decode(gzip.decode(base64.decode(raw)))) as T?;
    } on Object {
      // Corrupt, or not a T: same as missing.
      await delete(name);
      return null;
    }
  }

  Future<void> delete(String name) => _storage.delete(key: _id(name));

  /// Removes this namespace's entries only.
  Future<void> clear() async {
    final all = await _storage.readAll();
    for (final key in all.keys.where((k) => k.startsWith('$namespace.'))) {
      await _storage.delete(key: key);
    }
  }
}
