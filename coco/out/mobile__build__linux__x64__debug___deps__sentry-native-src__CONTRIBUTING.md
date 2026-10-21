# mobile/build/linux/x64/debug/_deps/sentry-native-src/CONTRIBUTING.md
lines:242 exports:
---
# Contribution guidelines

We love and welcome contributions!

In order to maintain a high quality, we run a number of checks on
different OS / Compiler combinations, and using different analysis tools.

## Prerequisites

Building and testing `sentry-native` currently requires the following tools:

- **CMake** and a supported C/C++ compiler, to actually build the code.
- **python** and **pytest**, to run integration tests.
- **clang-format** and **black**, to format the C/C++ and python code respectively.
- **curl** and **zlib** libraries (e.g. on Ubuntu: `libcurl4-openssl-dev`, `libz-dev`)

`pytest`, `clang-format` and `black` are installed as virtualenv dependencies automatically.

## Setting up Environment

    $ make setup

This sets up both git, including a pre-commit hook and submodules, and installs
a python virtualenv which is used to run tests and formatting.

## Formatting Code

    $ make format

This should be done automatically as part of the pre-commit hook, but can also
be done manually.

    $ black tests

In Powershell on Windows you can use

    $ .\scripts\run_formatters.ps1

to invoke both formatters.

