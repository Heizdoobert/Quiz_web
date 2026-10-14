# mobile/linux/flutter/ephemeral/.plugin_symlinks/connectivity_plus/CHANGELOG.md
lines:577 exports:
---
## 7.3.2

 - **FIX**(connectivity_plus): release iOS multi-engine callbacks ([#3957](https://github.com/fluttercommunity/plus_plugins/issues/3957)). ([4b6998aa](https://github.com/fluttercommunity/plus_plugins/commit/4b6998aaea2787d01a44c6a13e5eab18afeb4fa1))
 - **CHORE**(connectivity_plus): update to nm version 0.6.0 ([#3988](https://github.com/fluttercommunity/plus_plugins/pull/3988)). ([a30de773](https://github.com/fluttercommunity/plus_plugins/commit/a30de773d9ea7382be0b5a15ac28ac786a195977))


## 7.3.1

 - **FIX**(connectivity_plus): prevent Linux client leaks ([#3929](https://github.com/fluttercommunity/plus_plugins/issues/3929)). ([bab4cd3e](https://github.com/fluttercommunity/plus_plugins/commit/bab4cd3ea03c8a402121bf5c5af68fc2dbb16892))

## 7.3.0

 - **FEAT**(connectivity_plus): add hasConnectivity() utility extension ([#3842](https://github.com/fluttercommunity/plus_plugins/issues/3842)). ([4c623ae9](https://github.com/fluttercommunity/plus_plugins/commit/4c623ae91269d0aa2e795508c2d6f94659f51ef2))
 - **FIX**(connectivity_plus): guard eventSink after engine teardown (iOS) ([#3797](https://github.com/fluttercommunity/plus_plugins/issues/3797)). ([bf04cdf6](https://github.com/fluttercommunity/plus_plugins/commit/bf04cdf66598dc3fca274b8b1db2b92b0bf6b73e))
 - **FIX**(connectivity_plus): raise Apple platform minimums in SPM manifests to match FlutterFramework ([#3920](https://github.com/fluttercommunity/plus_plugins/issues/3920)). ([b3bb72e6](https://github.com/fluttercommunity/plus_plugins/commit/b3bb72e6f7fe5a41b8268ac855da7b55e274265b))
 - **FIX**(connectivity_plus): use Windows list manager events ([#3829](https://github.com/fluttercommunity/plus_plugins/issues/3829)). ([c876d41f](https://github.com/fluttercommunity/plus_plugins/commit/c876d41f259301d0ad6662afcf72e8aed4b74925))
 - **FIX**(connectivity_plus): improve network callback unregistration handling ([#3681](https://github.com/fluttercommunity/plus_plugins/issues/3681)). ([3e150ba7](https://github.com/fluttercommunity/plus_plugins/commit/3e150ba7d6c3219e022572b565000eedd4bedfd5))
 - **DOCS**(connectivity_plus): Update min iOS and MacOS in README ([#3926](https://github.com/fluttercommunity/plus_plugins/issues/3926)). ([a0207591](https://github.com/fluttercommunity/plus_plugins/commit/a0207591ad8d503a29c2e953f2c4ea7796b89f68))

## 7.2.0

 - **FEAT**(connectivity_plus): Updated Swift Package Manager setup for Flutter 3.44 ([#3893](https://github.com/fluttercommunity/plus_plugins/issues/3893)). ([9c064c2e](https://github.com/fluttercommunity/plus_plugins/commit/9c064c2eaa50c13f27a6e7d2b788f57580658353))

## 7.1.1

 - **DOCS**(connectivity_plus): Add missing info about Xcode 26.1.1 requirement, deduplicate headers ([#3792](https://github.com/fluttercommunity/plus_plugins/issues/3792)). ([ba6e6b94](https://github.com/fluttercommunity/plus_plugins/commit/ba6e6b94f673bb479a5891b8ca0fc5fd7b2345bc))

## 7.1.0

 - **FIX**(connectivity_plus): Register broadcast receiver with correct flag, bump minSDK to 21 ([#3781](https://github.com/fluttercommunity/plus_plugins/issues/3781)). ([93135ff2](https://github.com/fluttercommunity/plus_plugins/commit/93135ff28cd3a8241445d084927b8ca18d73fe58))
 - **FIX**(connectivity_plus): Use serial queue for NWPathMonitor to prevent race condition crash ([#3752](https://github.com/fluttercommunity/plus_plugins/issues/3752)). ([05a50f32](https://github.com/fluttercommunity/plus_plugins/commit/05a50f32ba0685a175c75396a05c9d18fb3ce9b4))
 - **FEAT**(connectivity_plus): add ConnectivityResult.satellite on Android and iOS ([#3771](https://github.com/fluttercommunity/plus_plugins/issues/3771)). ([2b58cffe](https://github.com/fluttercommunity/plus_plugins/commit/2b58cffedd8ebce127deba10d2e389c3c3bfcb4b))

## 7.0.0

> Note: This release has breaking changes.
>
> On Android plugin now requires the following:
> - Android Gradle Plugin >=8.12.1
> - Gradle wrapper >=8.13
