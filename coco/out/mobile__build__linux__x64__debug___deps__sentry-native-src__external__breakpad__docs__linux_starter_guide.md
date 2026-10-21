# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/linux_starter_guide.md
lines:110 exports:
---
# How To Add Breakpad To Your Linux Application

This document is an overview of using the Breakpad client libraries on Linux.

## Building the Breakpad libraries

Breakpad provides an Autotools build system that will build both the Linux
client libraries and the processor libraries. Running `./configure && make` in
the Breakpad source directory will produce
**src/client/linux/libbreakpad\_client.a**, which contains all the code
necessary to produce minidumps from an application.

## Integrating Breakpad into your Application

First, configure your build process to link **libbreakpad\_client.a** into your
binary, and set your include paths to include the **src** directory in the
**google-breakpad** source tree. Next, include the exception handler header:

```cpp
#include "client/linux/handler/exception_handler.h"
```

Now you can instantiate an `ExceptionHandler` object. Exception handling is active for the lifetime of the `ExceptionHandler` object, so you should instantiate it as early as possible in your application's startup process, and keep it alive for as close to shutdown as possible. To do anything useful, the `ExceptionHandler` constructor requires a path where it can write minidumps, as well as a callback function to receive information about minidumps that were written:

```cpp
static bool dumpCallback(const google_breakpad::MinidumpDescriptor& descriptor,
void* context, bool succeeded) {
  printf("Dump path: %s\n", descriptor.path());
  return succeeded;
}

void crash() { volatile int* a = (int*)(NULL); *a = 1; }

int main(int argc, char* argv[]) {
  google_breakpad::MinidumpDescriptor descriptor("/tmp");
  google_breakpad::ExceptionHandler eh(descriptor, NULL, dumpCallback, NULL, true, -1);
  crash();
  return 0;
}
```
