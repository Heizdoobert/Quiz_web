# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/getting_started_with_breakpad.md
lines:115 exports:
---
# Introduction

Breakpad is a library and tool suite that allows you to distribute an
application to users with compiler-provided debugging information removed,
record crashes in compact "minidump" files, send them back to your server, and
produce C and C++ stack traces from these minidumps. Breakpad can also write
minidumps on request for programs that have not crashed.

Breakpad is currently used by Google Chrome, Firefox, Google Picasa, Camino,
Google Earth, and other projects.

![Workflow](breakpad.png)

Breakpad has three main components:

*   The **client** is a library that you include in your application. It can
    write minidump files capturing the current threads' state and the identities
    of the currently loaded executable and shared libraries. You can configure
    the client to write a minidump when a crash occurs, or when explicitly
    requested.

*   The **symbol dumper** is a program that reads the debugging information
    produced by the compiler and produces a **symbol file**, in [Breakpad's own
    format](symbol_files.md).

*   The **processor** is a program that reads a minidump file, finds the
    appropriate symbol files for the versions of the executables and shared
    libraries the minidump mentions, and produces a human-readable C/C++ stack
    trace.

# The minidump file format

The minidump file format is similar to core files but was developed by Microsoft
for its crash-uploading facility. A minidump file contains:

*   A list of the executable and shared libraries that were loaded in the
    process at the time the dump was created. This list includes both file names
    and identifiers for the particular versions of those files that were loaded.

*   A list of threads present in the process. For each thread, the minidump
