# mobile/windows/flutter/ephemeral/.plugin_symlinks/jni/CHANGELOG.md
lines:232 exports:
---
## 0.14.2

- Fixed a bug where certain method of `JList`, `JSet`, and `JMap` did not work
  with nullable elements.
- Fixed a bug in `JList.lastIndexOf`.

## 0.14.1

- Updated `bin/setup.dart` to use Gradle instead of Maven for building Java sources. Added gradle executables 
  and bootstrap jars [#2003](https://github.com/dart-lang/native/issues/2003)
- Added `JObject.isInstanceOf` which checks whether a `JObject` is an instance 
  of a java class.
- Fixed a [bug](https://github.com/dart-lang/native/issues/1908) where
  Java interfaces implemented in on the main thread in Dart could deadlock when
  invoked from the main thread outside the context of a Dart isolate.

## 0.14.0

- Added `DynamicLibraryLoadError` which is thrown when the dynamic library fails
  to load. `HelperNotFoundError` will only be thrown when the helper library
  cannot be found.
- Update the README.md to include info about generating bindings for built-in
  java types.
- Do not require a `dylibDir` when running `Jni.spawn` from Dart standalone,
  instead use the default value of `build/jni_libs`.
- Added `JArray.of`, which allows a `JArray` to be constructed from an
  `Iterable`.
- Added `JObject.isA`, which checks whether a `JObject` is an instance of a java
  typeclass.
- Do not require JAWT when building for desktop.
- Added `JByteArray.from`, which allows a `JByteArray` to be constructed from an
  `Iterable<int>`.

## 0.13.0

- **Breaking Change**: Separated primitive arrays from object arrays.
  Previously, a primitive array like an array of bytes was typed
  `JArray<jbyte>`. Now `JArray<T>` only accepts `JObject`s as types and
  primitive arrays like arrays of bytes have their own types such as
  `JByteArray`.
