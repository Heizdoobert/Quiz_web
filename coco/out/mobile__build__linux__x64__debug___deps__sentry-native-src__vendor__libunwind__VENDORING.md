# mobile/build/linux/x64/debug/_deps/sentry-native-src/vendor/libunwind/VENDORING.md
lines:180 exports:
---
# Vendored libunwind — Maintenance Notes

## Source

- **Upstream**: https://github.com/libunwind/libunwind
- **Version**: 1.8.3 (from the release tarball, *not* from the git repository)
- **Tarball**: https://github.com/libunwind/libunwind/releases/download/v1.8.3/libunwind-1.8.3.tar.gz

## Purpose

libunwind is vendored so the sentry-native SDK can perform stack unwinding on
Linux without requiring users to install any external packages.

Two CMake targets are provided:

- **`unwind`** — local unwinding only (`L`-prefix sources, `_UL*` symbols).
  Used by the main `sentry` library and the inproc backend.
- **`unwind_remote`** — local + remote unwinding (`L`-prefix + `G`-prefix
  sources + `src/ptrace/` accessors, `_UL*` + `_U*` + `_UPT_*` symbols).
  Only built when `LIBUNWIND_BUILD_REMOTE` is set (i.e., native backend on
  Linux).  Used by the `sentry-crash` daemon for out-of-process DWARF
  unwinding and symbol name resolution via `unw_init_remote()` /
  `unw_get_proc_name()`.

## Supported Architectures (built by CMake)

| Architecture       | `src/` dir     | `include/tdep-*` dir    |
|--------------------|----------------|-------------------------|
| x86_64             | `src/x86_64/`  | `include/tdep-x86_64/`  |
| x86 (i686, 32-bit) | `src/x86/`     | `include/tdep-x86/`     |
| aarch64            | `src/aarch64/` | `include/tdep-aarch64/` |
| arm (32-bit)       | `src/arm/`     | `include/tdep-arm/`     |

Core shared code: `src/mi/`, `src/dwarf/`, `src/os-linux.c`,
`src/dl-iterate-phdr.c`.

> **Note:** `src/unwind/` is present in the tree but is **not compiled**. See
> [Excluded: C++ exception ABI sources](#excluded-c-exception-abi-sources) below.

## What Was Removed from the Release Tarball
