# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/doc/developing.md
lines:327 exports:
---
<!--
Copyright 2015 The Crashpad Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Developing Crashpad

## Status

[Project status](status.md) information has moved to its own page.

## Introduction

Crashpad is a [Chromium project](https://www.chromium.org/Home). Most of its
development practices follow Chromium’s. In order to function on its own in
other projects, Crashpad uses
[mini_chromium](https://chromium.googlesource.com/chromium/mini_chromium/), a
small, self-contained library that provides many of Chromium’s useful low-level
base routines. [mini_chromium’s
README](https://chromium.googlesource.com/chromium/mini_chromium/+/main/README.md)
provides more detail.

## Prerequisites

To develop Crashpad, the following tools are necessary, and must be present in
the `$PATH` environment variable:

 * Appropriate development tools.
    * On macOS, install [Xcode](https://developer.apple.com/xcode/). The latest
