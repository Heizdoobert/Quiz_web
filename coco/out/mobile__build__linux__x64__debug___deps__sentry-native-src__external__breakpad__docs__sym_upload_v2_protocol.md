# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/sym_upload_v2_protocol.md
lines:214 exports:
---
# Introduction

The `sym_upload` tool is able to operate in `sym-upload-v2` protocol mode, in
addition to the legacy protocol (which will be referred to as `sym-upload-v1`
for the rest of this document). For now `sym-upload-v2` is HTTP/REST-based but
it could be extended to operate over gRPC instead, in the future.

# Table of Contents
* [Why](#why)
* [How](#how)
   * [Uploading](#uploading)
     * [Uploading with `sym_upload`](#uploading-with-sym_upload)
     * [Uploading with curl](#uploading-with-curl)
     * [Serving the `sym-upload-v2` protocol](#serving-the-sym-upload-v2-protocol)
       * [Authenticate using `key`](#authenticate-using-key)
       * [Symbol `checkStatus`](#symbol-checkstatus)
       * [Upload `create`](#upload-create)
       * [Uploading the symbol file](#uploading-the-symbol-file)
       * [Upload complete](#upload-complete)


# Why

Using `sym_upload` in `sym-upload-v2` protocol mode has the following features
beyond `sym-upload-v1`:
  * Authentication via `key` (arbitrary secret).
  * Symbol identifier (product of `debug_file` and `debug_id`, as recorded in
output from `dump_syms`) can be checked against existing symbol information on
server. If it's present, then the upload is skipped entirely.

# How

## Uploading

### Uploading with `sym_upload`

Uploading in `sym-upload-v2` protocol mode is easy. Invoke `sym_upload` like
```
$ ./sym_upload -p sym-upload-v2 [-k <API-key>] <symbol-file> <API-URL>
```
