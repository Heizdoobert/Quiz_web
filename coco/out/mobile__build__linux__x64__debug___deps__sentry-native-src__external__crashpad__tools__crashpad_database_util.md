# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/crashpad_database_util.md
lines:208 exports:
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

# crashpad_database_util(1)

## Name

crashpad_database_util—Operate on Crashpad crash report databases

## Synopsis

**crashpad_database_util** [_OPTION…_]

## Description

Operates on Crashpad crash report databases. The database’s settings can be
queried and modified, and information about crash reports stored in the database
can be displayed.

When this program is requested to both show and set information in a single
invocation, all “show” operations will be completed prior to beginning any “set”
operation.

Programs that use the Crashpad client library directly will not normally use
this tool, but may use the database through the programmatic interfaces in the
client library. This tool exists to allow developers to manipulate a Crashpad
database.
