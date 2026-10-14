# mobile/windows/flutter/ephemeral/.plugin_symlinks/package_info_plus/README.md
lines:144 exports:
---
# package_info_plus

[![package_info_plus](https://github.com/fluttercommunity/plus_plugins/actions/workflows/package_info_plus.yaml/badge.svg)](https://github.com/fluttercommunity/plus_plugins/actions/workflows/package_info_plus.yaml)
[![pub points](https://img.shields.io/pub/points/package_info_plus?color=2E8B57&label=pub%20points)](https://pub.dev/packages/package_info_plus/score)
[![pub package](https://img.shields.io/pub/v/package_info_plus.svg)](https://pub.dev/packages/package_info_plus)

[<img src="../../../assets/flutter-favorite-badge.png" width="100" />](https://flutter.dev/docs/development/packages-and-plugins/favorites)

This Flutter plugin provides an API for querying information about an application package.

## Platform Support

| Android |  iOS  | macOS |  Web  | Linux | Windows |
| :-----: | :---: | :---: | :---: | :---: | :-----: |
|✅|✅|✅|✅|✅|✅|

## Requirements

- Flutter >=3.19.0
- Dart >=3.3.0 <4.0.0
- iOS >=12.0
- macOS >=10.14
- Java 17
- Kotlin 2.2.0
- Android Gradle Plugin >=8.12.1
- Gradle wrapper >=8.13

## Usage

You can use the PackageInfo to query information about the application package. This works both on
iOS and Android.

```dart
import 'package:package_info_plus/package_info_plus.dart';

...

// Be sure to add this line if `PackageInfo.fromPlatform()` is called before runApp()
WidgetsFlutterBinding.ensureInitialized();

