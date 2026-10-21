# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/third_party/lss/tests/README.md
lines:52 exports:
---
# LSS Tests

## Source Layout

The general layout of the tests:
* [test_skel.h]: Test helpers for common checks/etc...
* xxx.c: Unittest for the xxx syscall (e.g. `open.c`).
* [Makefile]: New tests should be registered in the `TESTS` variable.

## Test Guidelines

The unittest itself generally follows the conventions:
* Written in C (unless a very specific language behavior is needed).
* You should only need to `#include "test_skel.h"`.  For new system headers, try
  to add them here rather than copying to exact unittest (if possible).
  It might slow compilation down slightly, but makes the code easier to manage.
  Make sure it is included first.
* Use `assert()` on everything to check return values.
* Use `sys_xxx()` to access the syscall via LSS (compared to `xxx()` which tends
  to come from the C library).
* If you need a tempfile, use `tempfile.XXXXXX` for templates with helpers like
  `mkstemp`.  Try to clean them up when you're done with them.
  These will be created in the cwd, but that's fine.
* Don't worry about trying to verify the kernel/C library API and various edge
  cases.  The goal of LSS is to make sure that we pass args along correctly to
  the syscall only.
* Make sure to leave comments in the test so it's clear what behavior you're
  trying to verify (and how).

Feel free to extend [test_skel.h] with more helpers if they're useful to more
than one test.

If you're looking for a simple example, start with [unlink.c](./unlink.c).
You should be able to copy this over and replace the content of `main()`.

## Running The Tests

Simply run `make`.  This will compile & execute all the tests on your local
system.  A standard `make clean` will clean up all the objects.

