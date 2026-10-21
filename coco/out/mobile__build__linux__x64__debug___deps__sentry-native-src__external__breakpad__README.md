# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/README.md
lines:82 exports:
---
# Breakpad

Breakpad is a set of client and server components which implement a
crash-reporting system.

* [Homepage](https://chromium.googlesource.com/breakpad/breakpad/)
* [Documentation](./docs/)
* [Bugs](https://bugs.chromium.org/p/google-breakpad/)
* Discussion/Questions: [google-breakpad-discuss@googlegroups.com](https://groups.google.com/d/forum/google-breakpad-discuss)
* Developer/Reviews: [google-breakpad-dev@googlegroups.com](https://groups.google.com/d/forum/google-breakpad-dev)
* Tests: [![Build+Test CI](https://github.com/google/breakpad/actions/workflows/build-test-ci.yml/badge.svg)](https://github.com/google/breakpad/actions/workflows/build-test-ci.yml) [![Build status](https://ci.appveyor.com/api/projects/status/eguv4emv2rhq68u2?svg=true)](https://ci.appveyor.com/project/vapier/breakpad)
* Coverage [![Coverity Status](https://scan.coverity.com/projects/9215/badge.svg)](https://scan.coverity.com/projects/google-breakpad)

## Getting started (from main)

1.  First, [download depot_tools](http://dev.chromium.org/developers/how-tos/install-depot-tools)
    and ensure that they’re in your `PATH`.

2.  Create a new directory for checking out the source code (it must be named
    breakpad).

    ```sh
    mkdir breakpad && cd breakpad
    ```

3.  Run the `fetch` tool from depot_tools to download all the source repos.

    ```sh
    fetch breakpad
    cd src
    ```

4.  Build the source.

    ```sh
    ./configure && make
    ```

    You can also cd to another directory and run configure from there to build
    outside the source tree.
