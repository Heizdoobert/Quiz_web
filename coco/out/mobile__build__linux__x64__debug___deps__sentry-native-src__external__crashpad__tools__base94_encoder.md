# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/tools/base94_encoder.md
lines:100 exports:
---
<!--
Copyright 2020 The Crashpad Authors

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

# base94_encoder(1)

## Name

base94_encoder—Encode/Decode the given file

## Synopsis

**base94_encoder** [_OPTION…_] input-file output-file

## Description

Encodes a file for printing safely by compressing and base94 encoding it.

The base94_encoder can decode the input file by base94 decoding and
uncompressing it.

## Options

 * **-e**, **--encode**

   Compress and encode the input file to a base94 encoded file.

 * **-d**, **--decode**
