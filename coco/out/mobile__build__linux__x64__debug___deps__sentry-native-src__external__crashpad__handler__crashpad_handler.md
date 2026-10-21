# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/handler/crashpad_handler.md
lines:349 exports:
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

# crashpad_handler(8)

## Name

crashpad_handler—Crashpad’s exception handler server

## Synopsis

**crashpad_handler** [_OPTION…_]

## Description

This program is Crashpad’s main exception-handling server. It is responsible for
catching exceptions, writing crash reports, and uploading them to a crash report
collection server. Uploads are disabled by default, and can only be enabled by a
Crashpad client using the Crashpad client library, typically in response to a
user requesting this behavior.

On macOS, this server may be started by its initial client, in which case it
performs a handshake with this client via a pipe established by the client that
is inherited by the server, referenced by the **--handshake-fd** argument.
During the handshake, the server furnishes the client with a send right that the
client may use as an exception port. The server retains the corresponding
receive right, which it monitors for exception messages. When the receive right
