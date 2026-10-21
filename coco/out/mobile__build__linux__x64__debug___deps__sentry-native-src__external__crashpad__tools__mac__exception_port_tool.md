# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/mac/exception_port_tool.md
lines:234 exports:
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

# exception_port_tool(1)

## Name

exception_port_tool—Show and change Mach exception ports

## Synopsis

**exception_port_tool** [_OPTION…_] [_COMMAND_ [_ARG…_]]

## Description

Shows Mach exception ports registered for a thread, task, or host target with a
__--show-*__ option, changes Mach exception ports with **--set-handler**, shows
changes with a __--show-new-*__ option, and executes _COMMAND_ along with any
arguments specified (_ARG…_) with the changed exception ports in effect.

## Options

 * **-s**, **--set-handler**=_DESCRIPTION_

   Set an exception port to _DESCRIPTION_. This option may appear zero, one, or
   more times.

