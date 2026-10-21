# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/doc/ios_overview_design.md
lines:191 exports:
---
<!--
Copyright 2021 The Crashpad Authors

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

# iOS Crashpad Overview Design

[TOC]

## iOS Limitations

Crashpad on other platforms captures exceptions out-of-process. The iOS sandbox,
however, restricts applications from delegating work to separate processes.
This limitation means Crashpad on iOS must combine the work of the handler and
the client into the same process as the main application.

## The Crashpad In-Process Handler

In-process handling comes with a number of limitations and difficulties. It is
not possible to catch the specific Mach exception `EXC_CRASH`, so certain groups
of crashes cannot be captured. This includes some major ones, like out-of-memory
crashes. This also introduces difficulties in capturing all the relevant crash
data and writing the minidump, as the process itself is in an unsafe state.

While handling an exception, the handler may not, for example:

 - Allocate memory.
 - Use libc, or most any library call.

