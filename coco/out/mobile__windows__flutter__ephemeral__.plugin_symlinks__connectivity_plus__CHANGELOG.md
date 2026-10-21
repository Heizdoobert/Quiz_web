# mobile/windows/flutter/ephemeral/.plugin_symlinks/connectivity_plus/CHANGELOG.md
lines:453 exports:
---
## 5.0.2

 - **FIX**(connectivity_plus): Return correct connection state on Linux ([#2371](https://github.com/fluttercommunity/plus_plugins/issues/2371)). ([26576d83](https://github.com/fluttercommunity/plus_plugins/commit/26576d838be3b39121fd77ab33f49fc1fff1a97f))

## 5.0.1

 - **FIX**(connectivity_plus): Fix CHANGELOG to not mention Kotlin requirement ([#2246](https://github.com/fluttercommunity/plus_plugins/issues/2246)). ([e489d4aa](https://github.com/fluttercommunity/plus_plugins/commit/e489d4aa7a223b152b89b6c33ae994e8a73679bd))

## 5.0.0

> Note: This release has breaking changes.

 - **BREAKING** **FIX**(connectivity_plus): Bump min iOS to 12 to not crash after builds with Xcode 15 ([#2169](https://github.com/fluttercommunity/plus_plugins/issues/2169)). ([cf7d93fb](https://github.com/fluttercommunity/plus_plugins/commit/cf7d93fbfc76830acf2db755543cf4235a49df60))
 - **FIX**(connectivity_plus): Revert bump compileSDK to 34 ([#2229](https://github.com/fluttercommunity/plus_plugins/issues/2229)). ([01df65ce](https://github.com/fluttercommunity/plus_plugins/commit/01df65ce0268093de5dd381c84d251668dc95984))
 - **FEAT**(connectivity_plus): Remove deprecated VALID_ARCHS iOS property ([#2021](https://github.com/fluttercommunity/plus_plugins/issues/2021)). ([ee89d583](https://github.com/fluttercommunity/plus_plugins/commit/ee89d5836c7e598fce07d89e82a2d127ddfacbf8))


## 4.0.2

 - **FIX**(connectivity_plus): Downgrade js version to work with Flutter 3.3.10 ([#1989](https://github.com/fluttercommunity/plus_plugins/issues/1989)). ([42938c0c](https://github.com/fluttercommunity/plus_plugins/commit/42938c0c03132f7f50fa047c2970660d2720d320))
 - **FIX**(connectivity_plus): Regenerate iOS and MacOS example apps ([#1874](https://github.com/fluttercommunity/plus_plugins/issues/1874)). ([fc22e54e](https://github.com/fluttercommunity/plus_plugins/commit/fc22e54ec166d37d4326a9271677054fd34ccc3c))
 - **DOCS**(all): Fix example links on pub.dev ([#1863](https://github.com/fluttercommunity/plus_plugins/issues/1863)). ([d726035a](https://github.com/fluttercommunity/plus_plugins/commit/d726035ad7631d5a1397d0a2e5df23dc7e30a4f7))

## 4.0.1

 - **DOCS**(all): Update READMEs ([#1828](https://github.com/fluttercommunity/plus_plugins/issues/1828)). ([57d9c884](https://github.com/fluttercommunity/plus_plugins/commit/57d9c8845edfc81fdbabcef9eb1d1ca450e62e7d))

## 4.0.0

> Note: This release has breaking changes.

 - **CHORE**(connectivity_plus): Update Flutter dependencies, set Flutter >=3.3.0 and Dart to >=2.18.0 <4.0.0
 - **BREAKING** **FIX**(all): Add support of namespace property to support Android Gradle Plugin (AGP) 8 (#1727). Projects with AGP < 4.2 are not supported anymore. It is highly recommended to update at least to AGP 7.0 or newer.
 - **BREAKING** **CHORE**(connectivity_plus): Bump min Android to 4.4 (API 19) and iOS to 11, update podspec file (#1782).

## 3.0.6

 - **FIX**(all): Revert addition of namespace to avoid build fails on old AGPs (#1725).

## 3.0.5
