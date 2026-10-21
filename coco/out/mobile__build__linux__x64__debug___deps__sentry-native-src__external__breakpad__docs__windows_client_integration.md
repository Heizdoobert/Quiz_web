# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/breakpad/docs/windows_client_integration.md
lines:70 exports:
---
# Windows Integration overview

## Windows Client Code

The Windows client code is in the `src/client/windows` directory of the tree.
Since the header files are fairly well commented some specifics are purposely
omitted from this document.

## Integration of minidump-generation

Once you build the solution inside `src/client/windows`, an output file of
`exception_handler.lib` will be generated. You can either check this into your
project's directory or build directly from the source, as the project itself
does.

Enabling Breakpad in your application requires you to `#include
"exception_handler.h"` and instantiate the `ExceptionHandler` object like so:

```
  handler = new ExceptionHandler(const wstring& dump_path,
                                                              FilterCallback filter,
                                                              MinidumpCallback callback,
                                                              void* callback_context,
                                                              int handler_types,
                                                              MINIDUMP_TYPE dump_type,
                                                              const wchar_t* pipe_name,
                                                              const CustomClientInfo* custom_info);
```

The parameters, in order, are:

*   pathname for minidumps to be written to - this is ignored if OOP dump
    generation is used
*   A callback that is called when the exception is first handled - you can
    return true/false here to continue/stop exception processing
*   A callback that is called after minidumps have been written
*   Context for the callbacks
*   Which exceptions to handle - see `HandlerType` enumeration in
    exception\_handler.h
*   The type of minidump to generate, using the `MINIDUMP_TYPE` definitions in
