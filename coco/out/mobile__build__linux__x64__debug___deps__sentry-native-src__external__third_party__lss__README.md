# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/third_party/lss/README.md
lines:138 exports:
---
# Linux Syscall Support (LSS)

Every so often, projects need to directly embed Linux system calls instead of
calling the implementations in the system runtime library.

This project provides a header file that can be included into your application
whenever you need to make direct system calls.

The goal is to provide an API that generally mirrors the standard C library
while still making direct syscalls.  We try to hide some of the differences
between arches when reasonably feasible.  e.g. Newer architectures no longer
provide an `open` syscall, but do provide `openat`.  We will still expose a
`sys_open` helper by default that calls into `openat` instead.

We explicitly do not expose the raw syscall ABI including all of its historical
warts to the user.  We want people to be able to easily make a syscall, not have
to worry that on some arches size args are swapped or they are shifted.

Please be sure to review the Caveats section below however.

## How to include linux\_syscall\_support.h in your project

You can either copy the file into your project, or preferably, you can set up
Git submodules to automatically pull from our source repository.

## Supported targets

The following architectures/ABIs have been tested (at some point) and should
generally work.  If you don't see your combo listed here, please double check
the header itself as this list might be out of date.

* x86 32-bit (i.e. i386, i486, i586, i686, Intel, AMD, etc...)
* [x86_64 64-bit](https://en.wikipedia.org/wiki/X86-64) (i.e. x86-64, amd64, etc...)
* [x32 32-bit](https://sites.google.com/site/x32abi/)
* [ARM 32-bit](https://en.wikipedia.org/wiki/ARM_architecture) OABI
* [ARM 32-bit](https://en.wikipedia.org/wiki/ARM_architecture) EABI (i.e. armv6, armv7, etc...)
* AARCH64 64-bit (i.e. arm64, armv8, etc...)
* PowerPC 32-bit (i.e. ppc, ppc32, etc...)
* MIPS 32-bit o32 ABI
* MIPS 32-bit n32 ABI
