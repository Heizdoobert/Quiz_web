# mobile/windows/flutter/ephemeral/.plugin_symlinks/connectivity_plus/README.md
lines:106 exports:
---
# connectivity_plus

[![Flutter Community: connectivity_plus](https://fluttercommunity.dev/_github/header/connectivity_plus)](https://github.com/fluttercommunity/community)

[![pub package](https://img.shields.io/pub/v/connectivity_plus.svg)](https://pub.dev/packages/connectivity_plus)
[![pub points](https://img.shields.io/pub/points/connectivity_plus?color=2E8B57&label=pub%20points)](https://pub.dev/packages/connectivity_plus/score)
[![connectivity_plus](https://github.com/fluttercommunity/plus_plugins/actions/workflows/connectivity_plus.yaml/badge.svg)](https://github.com/fluttercommunity/plus_plugins/actions/workflows/connectivity_plus.yaml)

<p class="center">
<center><a href="https://flutter.dev/docs/development/packages-and-plugins/favorites" target="_blank" rel="noreferrer noopener"><img src="../../../website/static/img/flutter-favorite-badge.png" width="100" alt="build"></a></center>
</p>

This plugin allows Flutter apps to discover network connectivity and configure
themselves accordingly. It can distinguish between cellular vs WiFi connection.

> **Note**
>
> On Android, this does not guarantee connection to Internet. For instance, the app might have wifi access but it might be a VPN or a hotel WiFi > with no access.

## Platform Support

| Android | iOS | MacOS | Web | Linux | Windows |
| :-----: | :-: | :---: | :-: | :---: | :-----: |
|   ✅    | ✅  |  ✅   | ✅  |  ✅   |   ✅    |

## Usage

Sample usage to check current status:

```dart
import 'package:connectivity_plus/connectivity_plus.dart';

final connectivityResult = await (Connectivity().checkConnectivity());
if (connectivityResult == ConnectivityResult.mobile) {
  // I am connected to a mobile network.
} else if (connectivityResult == ConnectivityResult.wifi) {
  // I am connected to a wifi network.
} else if (connectivityResult == ConnectivityResult.ethernet) {
  // I am connected to a ethernet network.
} else if (connectivityResult == ConnectivityResult.vpn) {
