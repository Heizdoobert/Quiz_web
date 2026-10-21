# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/client_design.md
lines:223 exports:
---
# Breakpad Client Libraries

## Objective

The Breakpad client libraries are responsible for monitoring an application for
crashes (exceptions), handling them when they occur by generating a dump, and
providing a means to upload dumps to a crash reporting server. These tasks are
divided between the “handler” (short for “exception handler”) library linked in
to an application being monitored for crashes, and the “sender” library,
intended to be linked in to a separate external program.

## Background

As one of the chief tasks of the client handler is to generate a dump, an
understanding of [dump files](processor_design.md) will aid in understanding the
handler.

## Overview

Breakpad provides client libraries for each of its target platforms. Currently,
these exist for Windows on x86 and Mac OS X on both x86 and PowerPC. A Linux
implementation has been written and is currently under review.

Because the mechanisms for catching exceptions and the methods for obtaining the
information that a dump contains vary between operating systems, each target
operating system requires a completely different handler implementation. Where
multiple CPUs are supported for a single operating system, the handler
implementation will likely also require separate code for each processor type to
extract CPU-specific information. One of the goals of the Breakpad handler is to
provide a prepackaged cross-platform system that masks many of these
system-level differences and quirks from the application developer. Although the
underlying implementations differ, the handler library for each system follows
the same set of principles and exposes a similar interface.

Code that wishes to take advantage of Breakpad should be linked against the
handler library, and should, at an appropriate time, install a Breakpad handler.
For applications, it is generally desirable to install the handler as early in
the start-up process as possible. Developers of library code using Breakpad to
monitor itself may wish to install a Breakpad handler when the library is
loaded, or may only want to install a handler when calls are made in to the
