# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/exception_handling.md
lines:128 exports:
---
The goal of this document is to give an overview of the exception handling
options in breakpad.

# Basics

Exception handling is a mechanism designed to handle the occurrence of
exceptions, special conditions that change the normal flow of program execution.

`SetUnhandledExceptionFilter` replaces all unhandled exceptions when Breakpad is
enabled. TODO: More on first and second change and vectored v. try/catch.

There are two main types of exceptions across all platforms: in-process and
out-of-process.

# In-Process

In process exception handling is relatively simple since the crashing process
handles crash reporting. It is generally considered unsafe to write a minidump
from a crashed process. For example, key data structures could be corrupted or
the stack on which the exception handler runs could have been overwritten. For
this reason all platforms also support some level of out-of-process exception
handling.

## Windows

In-process exception handling Breakpad creates a 'handler head' that waits
infinitely on a semaphore at start up. When this thread is woken it writes the
minidump and signals to the excepting thread that it may continue. A filter will
tell the OS to kill the process if the minidump is written successfully.
Otherwise it continues.

# Out-of-Process

Out-of-process exception handling is more complicated than in-process exception
handling because of the need to set up a separate process that can read the
state of the crashing process.

## Windows

Breakpad uses two abstractions around the exception handler to make things work:
