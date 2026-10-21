# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/zlib/zlib/contrib/minizip/minizip.md
lines:9 exports:
---
Minizip is a library provided by //third_party/zlib [1]. Its zip and unzip
tools can be built in a developer checkout for testing purposes with:

```shell
  autoninja -C out/Release minizip_bin
  autoninja -C out/Release miniunz_bin
```

[1] Upstream is https://github.com/madler/zlib/tree/master/contrib/minizip
