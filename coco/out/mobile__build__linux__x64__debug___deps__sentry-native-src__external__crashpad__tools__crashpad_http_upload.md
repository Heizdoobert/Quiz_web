# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/crashpad_http_upload.md
lines:132 exports:
---
<!--
Copyright 2017 The Crashpad Authors

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

# crashpad_http_upload(1)

## Name

crashpad_http_upload—Send an HTTP POST request

## Synopsis

**crashpad_http_uplaod** [_OPTION…_]

## Description

Performs an HTTP or HTTPS POST, building a `multipart/form-data` request from
key-value pairs and files in the manner of an HTML `<form>` with a POST action.
Provides the response.

Programs that use the Crashpad client library directly will not normally use
this tool. This tool is provided for debugging and testing as it isolates
Crashpad’s networking implementation normally used to upload crash reports to
a crash report collection server, making it available for more general use.

## Options

 * **-f**, **--file**=_KEY_=_PATH_
