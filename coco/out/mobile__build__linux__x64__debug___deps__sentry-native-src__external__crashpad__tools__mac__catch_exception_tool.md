# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/mac/catch_exception_tool.md
lines:140 exports:
---
<!--
Copyright 2014 The Crashpad Authors

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

# catch_exception_tool(1)

## Name

catch_exception_tool—Catch Mach exceptions and display information about them

## Synopsis

**catch_exception_tool** **-m** _SERVICE_ [_OPTION…_]

## Description

Runs a Mach exception server registered with the bootstrap server under the name
_SERVICE_. The exception server is capable of receiving exceptions for
“behavior” values of `EXCEPTION_DEFAULT`, `EXCEPTION_STATE`, and
`EXCEPTION_STATE_IDENTITY`, with or without `MACH_EXCEPTION_CODES` set.

## Options

 * **-f**, **--file**=_FILE_

   Information about the exception will be appended to _FILE_ instead of the
   standard output stream.

