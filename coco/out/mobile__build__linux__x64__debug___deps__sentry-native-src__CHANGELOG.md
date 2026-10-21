# mobile/build/linux/x64/debug/_deps/sentry-native-src/CHANGELOG.md
lines:1881 exports:
---
# Changelog

## 0.16.6

**Features**:

- Add `sentry_is_enabled` for checking whether the SDK has been initialized. ([#2045](https://github.com/getsentry/sentry-native/pull/2045))
- Add `sentry_event_set_level` for setting the level of an individual event. ([#2038](https://github.com/getsentry/sentry-native/pull/2038))

**Fixes**:

- Native/Windows: prevent out-of-bounds PE debug-directory parsing. ([#2062](https://github.com/getsentry/sentry-native/pull/2062))
- Native/Linux: parse minidump-writer ELF build-id notes with `sentry__elf_find_note`. ([#2055](https://github.com/getsentry/sentry-native/pull/2055))
- Native/Linux: prevent malformed ELF metadata from bypassing module address bounds checks through integer overflow or underflow. ([#2064](https://github.com/getsentry/sentry-native/pull/2064))
- Native: Read frame records at pointer width in the crash daemon's frame-pointer walk, so 32-bit targets no longer read two stack slots per pointer. ([#2052](https://github.com/getsentry/sentry-native/pull/2052))
- Native: Report ARM32 registers for Linux crash events, and walk both r11-based ARM32 frame-record shapes (GCC's and clang's; Thumb r7 chains are not walked) in the crash daemon. ([#2053](https://github.com/getsentry/sentry-native/pull/2053))
- Prevent backend state races when `sentry_reinstall_backend` runs concurrently with scope observer callbacks. ([#2041](https://github.com/getsentry/sentry-native/pull/2041))
- Native: clean up stale envelopes after crashes with `SENTRY_TRANSPORT=none`. ([#2049](https://github.com/getsentry/sentry-native/pull/2049))
- `sentry_set_trace` omits `parent_span_id` when the caller does not provide one, instead of serializing it as `null`. ([#2047](https://github.com/getsentry/sentry-native/pull/2047))
- Native/Linux i386: write valid thread stack descriptors to minidumps when stack addresses use the upper half of the 32-bit address space. ([#2054](https://github.com/getsentry/sentry-native/pull/2054))
- Native/Linux: cap ELF metadata section reads when resolving module SONAMEs. ([#2066](https://github.com/getsentry/sentry-native/pull/2066))
- Linux/ARM32: fix builds on 32-bit ARM systems, including 32-bit Raspberry Pi OS installations running a 64-bit kernel. ([#2063](https://github.com/getsentry/sentry-native/pull/2063))
- Guard size arithmetic when parsing envelopes and Linux OS release data, copying slices, and allocating memory during crash handling. ([#2059](https://github.com/getsentry/sentry-native/pull/2059))
- macOS: prevent out-of-bounds reads while parsing Mach-O load commands. ([#2065](https://github.com/getsentry/sentry-native/pull/2065))
- Prevent out-of-bounds reads when parsing JSON numbers from length-delimited buffers. ([#2067](https://github.com/getsentry/sentry-native/pull/2067))
- Validate session replay IDs before accessing staged files to prevent path traversal and unintended file uploads or deletions. ([#2071](https://github.com/getsentry/sentry-native/pull/2071))
- Native/Windows: resolve the WER module relative to `handler_path`, so it is found when the crash handler is installed outside the executable's directory. ([#2073](https://github.com/getsentry/sentry-native/pull/2073))
- Native: prevent buffer attachments from being written outside their UUID run directory. ([#2072](https://github.com/getsentry/sentry-native/pull/2072))
- Native/Windows: reject misleading export fallback symbols in stack traces when PDB files are unavailable. ([#2075](https://github.com/getsentry/sentry-native/pull/2075))

**Thank you**:

- [HuzaifaAbdulRehman](https://github.com/HuzaifaAbdulRehman)
- [GLinnik21](https://github.com/GLinnik21)

## 0.16.5

**Important behavior changes**:

- `sentry_options_set_enable_logs` and `sentry_options_set_enable_metrics` no longer have any effect. The corresponding getters always return true.
