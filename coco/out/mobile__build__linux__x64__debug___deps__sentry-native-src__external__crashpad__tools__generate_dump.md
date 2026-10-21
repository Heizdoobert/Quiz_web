# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/generate_dump.md
lines:127 exports:
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

# generate_dump(1)

## Name

generate_dump—Generate a minidump file containing a snapshot of a running
process

## Synopsis

**generate_dump** [_OPTION…_] _PID_

## Description

Generates a minidump file containing a snapshot of a running process whose
process identifier is _PID_. By default, the target process will be suspended
while the minidump is generated, and the minidump file will be written to
`minidump.PID`. After the minidump file is generated, the target process resumes
running.

The minidump file will contain information about the process, its threads, its
modules, and the system. It will not contain any exception information because
it will be generated from a live running process, not as a result of an
exception occurring.

