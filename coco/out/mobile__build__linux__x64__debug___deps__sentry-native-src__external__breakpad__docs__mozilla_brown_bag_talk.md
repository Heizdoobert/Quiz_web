# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/mozilla_brown_bag_talk.md
lines:82 exports:
---
# Breakpad Crash Reporting for Mozilla

*   January 24, 2007
    *   Links updated February 14, 2007
*   Mozilla HQ
*   Mark Mentovai
*   Brian Ryner

## What is a crash reporter?

*   Enables developers to analyze crashes that occur in the wild
*   Produces stack backtraces that help identify how a program failed
*   Offers higher-level data aggregation (topcrashes, MTBF statistics)

## Motivation

*   Talkback is proprietary and unmaintained
*   Smaller open-source projects have few options
*   Larger projects need flexibility and scalability

## Design Options

*   Stackwalking done on client
    *   Apple CrashReporter
    *   GNOME BugBuddy
*   Client sends memory dump
    *   Talkback
    *   Windows Error Reporting
    *   Breakpad

## Goals

*   Provide libraries around which systems can be based
*   Open-source
*   Cross-platform
    *   Mac OS X x86, PowerPC
    *   Linux x86
    *   Windows x86
*   No requirement to distribute symbols

