# mobile/windows/flutter/ephemeral/.plugin_symlinks/sentry_flutter/CHANGELOG.md
lines:4587 exports:
---
# Changelog

## 9.30.1

### Fixes

- (flutter) Restore Android replay config by @buenaflor in [#4037](https://github.com/getsentry/sentry-dart/pull/4037)

## 9.30.0

### Fixes

#### Flutter

- Fix an Android native/GPU memory leak caused by the background JNI worker outliving its Flutter engine, while preserving native reporting across cached-engine view detachment and reattachment. by @lucas-zimerman in [#3987](https://github.com/getsentry/sentry-dart/pull/3987)
- Await in-flight replay capture on scheduler stop by @lucas-zimerman in [#3935](https://github.com/getsentry/sentry-dart/pull/3935)

### Dependencies

#### Deps

- chore(deps): Update Android SDK to v8.56.0 by @buenaflor in [#4015](https://github.com/getsentry/sentry-dart/pull/4015)
- chore(deps): update Native SDK to v0.16.6 by @github-actions in [#4013](https://github.com/getsentry/sentry-dart/pull/4013)

### Internal Changes

- (symbols) Collect Apple framework symbols by @sentry-junior in [#4003](https://github.com/getsentry/sentry-dart/pull/4003)

## 9.29.0

### Dependencies

#### Deps

- chore(deps): Update Android SDK to v8.54.0 by @buenaflor in [#4001](https://github.com/getsentry/sentry-dart/pull/4001)
- chore(deps): update Native SDK to v0.16.5 by @github-actions in [#3998](https://github.com/getsentry/sentry-dart/pull/3998)

## 9.28.0

### Features
