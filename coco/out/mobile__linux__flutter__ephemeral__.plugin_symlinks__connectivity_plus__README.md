# mobile/linux/flutter/ephemeral/.plugin_symlinks/connectivity_plus/README.md
lines:156 exports:
---
# connectivity_plus

[![pub package](https://img.shields.io/pub/v/connectivity_plus.svg)](https://pub.dev/packages/connectivity_plus)
[![pub points](https://img.shields.io/pub/points/connectivity_plus?color=2E8B57&label=pub%20points)](https://pub.dev/packages/connectivity_plus/score)
[![connectivity_plus](https://github.com/fluttercommunity/plus_plugins/actions/workflows/connectivity_plus.yaml/badge.svg)](https://github.com/fluttercommunity/plus_plugins/actions/workflows/connectivity_plus.yaml)

[<img src="../../../assets/flutter-favorite-badge.png" width="100" />](https://flutter.dev/docs/development/packages-and-plugins/favorites)

This plugin allows Flutter apps to discover network connectivity types that can be used.

> **Note**
>
> You should not rely on the current connectivity status to decide whether you can reliably make a network request. Always guard your app code against timeouts and errors that might come from the network layer.
> Connection type availability does not guarantee that there is an Internet access. For example, the plugin might return Wi-Fi connection type, but it might be a connection with no Internet access due to network requirements (like on hotel Wi-Fi networks where user often needs to go through a captive portal to authorize first).
>

## Platform Support

| Android | iOS | macOS | Web | Linux | Windows |
| :-----: | :-: | :---: | :-: | :---: | :-----: |
|   ✅    | ✅  |  ✅   | ✅  |  ✅   |   ✅    |

## Requirements

- Flutter >=3.19.0
- Dart >=3.3.0 <4.0.0
- iOS >=13.0
- macOS >=10.15
- Java 17
- Android Gradle Plugin >=8.12.1
- Gradle wrapper >=8.13
- Xcode >= 26.1.1

## Usage

Sample usage to check currently available connection types:

```dart
import 'package:connectivity_plus/connectivity_plus.dart';

