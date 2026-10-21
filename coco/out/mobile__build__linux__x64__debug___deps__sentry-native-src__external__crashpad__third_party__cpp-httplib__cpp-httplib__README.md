# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/cpp-httplib/cpp-httplib/README.md
lines:1285 exports:
---
cpp-httplib
===========

[![](https://github.com/yhirose/cpp-httplib/workflows/test/badge.svg)](https://github.com/yhirose/cpp-httplib/actions)

A C++11 single-file header-only cross platform HTTP/HTTPS library.

It's extremely easy to set up. Just include the **httplib.h** file in your code!

> [!IMPORTANT]
> This library uses 'blocking' socket I/O. If you are looking for a library with 'non-blocking' socket I/O, this is not the one that you want.

Simple examples
---------------

#### Server (Multi-threaded)

```c++
#define CPPHTTPLIB_OPENSSL_SUPPORT
#include "path/to/httplib.h"

// HTTP
httplib::Server svr;

// HTTPS
httplib::SSLServer svr;

svr.Get("/hi", [](const httplib::Request &, httplib::Response &res) {
  res.set_content("Hello World!", "text/plain");
});

svr.listen("0.0.0.0", 8080);
```

#### Client

```c++
#define CPPHTTPLIB_OPENSSL_SUPPORT
#include "path/to/httplib.h"

