# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/stack_walking.md
lines:144 exports:
---
# Introduction

This page aims to provide a detailed description of how Breakpad produces stack
traces from the information contained within a minidump file.

# Details

## Starting the Process

Typically the stack walking process is initiated by instantiating the
[MinidumpProcessor](../src/processor/minidump_processor.cc)
class and calling the [MinidumpProcessor::Process](../src/processor/minidump_processor.cc#61)
method, providing it a minidump file to process. To produce a useful stack
trace, the MinidumpProcessor requires two other objects which are passed in its
constructor: a [SymbolSupplier](../src/google_breakpad/processor/symbol_supplier.h)
and a [SourceLineResolverInterface](../src/google_breakpad/processor/source_line_resolver_interface.h).
The SymbolSupplier object is responsible for locating and providing SymbolFiles
that match modules from the minidump. The SourceLineResolverInterface is
responsible for loading the symbol files and using the information contained
within to provide function and source information for stack frames, as well as
information on how to unwind from a stack frame to its caller. More detail will
be provided on these interactions later.

A number of data streams are extracted from the minidump to begin stack walking:
the list of threads from the process
([MinidumpThreadList](../src/google_breakpad/processor/minidump.h#335)),
the list of modules loaded in the process
([MinidumpModuleList](../src/google_breakpad/processor/minidump.h#501)),
and information about the exception that caused the process to crash
([MinidumpException](../src/google_breakpad/processor/minidump.h#615)).

## Enumerating Threads

For each thread in the thread list
([MinidumpThread](../src/google_breakpad/processor/minidump.h#299)),
the thread memory containing the stack for the thread
([MinidumpMemoryRegion](../src/google_breakpad/processor/minidump.h#236))
and the CPU context representing the CPU state of the thread at the time the
dump was written ([MinidumpContext](../src/google_breakpad/processor/minidump.h#171))
are extracted from the minidump. If the thread being processed is the thread
