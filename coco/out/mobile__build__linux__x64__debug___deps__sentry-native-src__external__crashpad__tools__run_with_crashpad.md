# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/run_with_crashpad.md
lines:147 exports:
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

# run_with_crashpad(1)

## Name

run_with_crashpad—Run a program with a Crashpad exception handler

## Synopsis

**run_with_crashpad** [_OPTION…_] _COMMAND_ [_ARG…_]

## Description

Starts a Crashpad exception handler server such as
[crashpad_handler(8)](../handler/crashpad_handler.md) and becomes its client,
setting an exception port referencing the handler. Then, executes _COMMAND_
along with any arguments specified (_ARG…_) with the new exception port in
effect.

On macOS, the exception port is configured to receive exceptions of type
`EXC_CRASH`, `EXC_RESOURCE`, and `EXC_GUARD` (until macOS 13). The exception
behavior is configured as `EXCEPTION_STATE_IDENTITY | MACH_EXCEPTION_CODES`. The
thread state flavor is set to `MACHINE_THREAD_STATE`.

Programs that use the Crashpad client library directly will not normally use
