# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/processor_design.md
lines:231 exports:
---
# Breakpad Processor Library

## Objective

The Breakpad processor library is an open-source framework to access the the
information contained within crash dumps for multiple platforms, and to use that
information to produce stack traces showing the call chain of each thread in a
process. After processing, this data is made available to users of the library.

## Background

The Breakpad processor is intended to sit at the core of a comprehensive
crash-reporting system that does not require debugging information to be
provided to those running applications being monitored. Some existing
crash-reporting systems, such as [GNOME](http://www.gnome.org/)’s Bug-Buddy and
[Apple](http://www.apple.com/)’s
[CrashReporter](http://developer.apple.com/technotes/tn2004/tn2123.html),
require symbolic
information to be present on the end user’s computer; in the case of
CrashReporter, the reports are transmitted only to Apple, not to third-party
developers. Other systems, such as [Microsoft](http://www.microsoft.com/)’s
[Windows Error Reporting](http://msdn.microsoft.com/isv/resources/wer/) and
SupportSoft’s Talkback, transmit only a snapshot of a crashed process’ state,
which can later be combined with symbolic debugging information without the need
for it to be present on end users’ computers. Because symbolic debugging
information consumes a large amount of space and is otherwise not needed during
the normal operation of software, and because some developers are reluctant to
release debugging symbols to their customers, Breakpad follows the latter
approach.

We know of no currently-maintained crash-reporting systems that meet our
requirements, which are to: * allow for symbols to be separate from the
application, * handle crash reports from multiple platforms, * allow developers
to operate their own crash-reporting platform, and to * be open-source. Windows
Error Reporting only functions for Microsoft products, and requires the
involvement of Microsoft’s servers. Talkback, while cross-platform, has not been
maintained and at this point does not support Mac OS X on x86, which we consider
to be a significant platform. Talkback is also closed-source commercial
software, and has very specific requirements for its server platform.

