# mobile/linux/flutter/ephemeral/.plugin_symlinks/jni/CHANGELOG.md
lines:319 exports:
---
## 1.1.0

- Add deep conversion utilities for converting between Dart values and Java.
- Documentation updates.

## 1.0.3

- Fix JNI build errors on Linux arm64.

## 1.0.2

- Revert an unnecessary (and breaking) KGP migration.

## 1.0.1

- Improve error message when JNI is used before Flutter plugin initialization.
- Improve no such method error handling.
- Fix memory leaks and deadlocks that can happen in callbacks, if the target
  isolate is shut down.
- Support versions 3.x of `package:package_config`.
- Make some internal-only FFI structs opaque. This is technically a breaking
  change, but it's extremely unlikely that any users are using these internal
  structs (and doing so would be a mistake).

## 1.0.0

- **Breaking Change**: The Flutter specific APIs `Jni.androidApplicationContext`
  and `Jni.androidActivity(int engineId)` have been moved to a new
  package:jni_flutter. If you are using package:jni on Android you may need to
  add this new package as a dependency.
- **Breaking Change**: All Java wrapper classes have been migrated to extension
  types. The main effects are:
  - All collections (`JList`, `JMap` etc) are now direct code generated wrappers
    around the Java objects, so are less Darty. Instead there are now Darty
    adapter classes you can access via `asDart()`.
  - No more nullable `JType` classes, only `JType` classes, and the `JType`
    class is simplified.
  - It is no longer necessary to pass around the `JType` in many cases where it
    used to be required.
- Added `Jni.captureStackTraceOnRelease` which defaults to `false`. When this is
