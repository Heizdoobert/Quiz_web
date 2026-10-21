# mobile/windows/flutter/ephemeral/.plugin_symlinks/sentry_flutter/README.md
lines:135 exports:
---
<p align="center">
  <a href="https://sentry.io" target="_blank" align="center">
    <img src="https://sentry-brand.storage.googleapis.com/sentry-logo-black.png" width="280">
  </a>
  <br />
</p>

Sentry SDK for Flutter
===========

| package | build | pub | likes | popularity | pub points |
| ------- | ------- | ------- | ------- | ------- | ------- |
| sentry_flutter | [![build](https://github.com/getsentry/sentry-dart/workflows/sentry-flutter/badge.svg?branch=main)](https://github.com/getsentry/sentry-dart/actions?query=workflow%3Asentry-flutter) | [![pub package](https://img.shields.io/pub/v/sentry_flutter.svg)](https://pub.dev/packages/sentry_flutter) | [![likes](https://img.shields.io/pub/likes/sentry_flutter)](https://pub.dev/packages/sentry_flutter/score) | [![popularity](https://img.shields.io/pub/popularity/sentry_flutter)](https://pub.dev/packages/sentry_flutter/score) | [![pub points](https://img.shields.io/pub/points/sentry_flutter)](https://pub.dev/packages/sentry_flutter/score)

This package includes support to native crashes through Sentry's native SDKs: ([Android](https://github.com/getsentry/sentry-java) and [iOS](https://github.com/getsentry/sentry-cocoa)).
It will capture errors in the native layer, including (Java/Kotlin/C/C++ for Android and Objective-C/Swift for iOS).

#### Usage

- Sign up for a Sentry.io account and get a DSN at https://sentry.io.

- Follow the installing instructions on [pub.dev](https://pub.dev/packages/sentry_flutter/install).

- Initialize the Sentry SDK using the DSN issued by Sentry.io:

- The SDK already runs your init `callback` on an error handler, such as [`runZonedGuarded`](https://api.flutter.dev/flutter/dart-async/runZonedGuarded.html) on Flutter versions prior to `3.3`, or [`PlatformDispatcher.onError`](https://api.flutter.dev/flutter/dart-ui/PlatformDispatcher/onError.html) on Flutter versions 3.3 and higher, so that errors are automatically captured.

```dart
import 'package:flutter/widgets.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = 'https://example@sentry.io/add-your-dsn-here';
    },
    // Init your App.
    appRunner: () => runApp(MyApp()),
  );
}
