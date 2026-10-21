# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/README.getsentry.md
lines:73 exports:
---
# Sentry Modifications

- File attachments support for MacOS and Windows. Based on changes made in
  https://github.com/Youw/crashpad/, distributed with Apache 2.0 License.
- Add `throws` declaration to `memfd_create` for compatibility with different
  libc versions.
- Build System Changes Listed Below.
- MinGW build support.
- Screenshot support for Windows.
- C++17 standard requirement (upstream uses C++20 or newer).

# Build System Changes

In order to minimize external dependencies, and to better integrate with
`sentry-native`, this fork replaced usage of `depo_tools` with explicit
submodules, and added CMake files for building.

Both submodules and CMake files currently only support building on macOS and
Windows, and do only export the necessary libraries and executables to
integrate the crashpad client.

When updating this fork, make sure to keep the files in sync, as explained
below.

## Submodules

For macOS and Windows support, only `third_party/mini_chromium` and
`third_party/zlib` are needed.

The specific submodule commit hashes can be found in the `./DEPS` file.

## CMake Integration

To allow building crashpad with CMake, the following CMake files were created
by manually translating the `BUILD.gn` files in the same folders (and following
included files):

- `./CMakeLists.txt`
- `./client/CMakeLists.txt`
- `./compat/CMakeLists.txt`
