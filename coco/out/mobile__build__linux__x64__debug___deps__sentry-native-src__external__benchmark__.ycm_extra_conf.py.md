# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/.ycm_extra_conf.py
lines:120 exports:
---
import os

import ycm_core

# These are the compilation flags that will be used in case there's no
# compilation database set (by default, one is not set).
# CHANGE THIS LIST OF FLAGS. YES, THIS IS THE DROID YOU HAVE BEEN LOOKING FOR.
flags = [
    "-Wall",
    "-Werror",
    "-pedantic-errors",
    "-std=c++0x",
    "-fno-strict-aliasing",
    "-O3",
    "-DNDEBUG",
    # ...and the same thing goes for the magic -x option which specifies the
    # language that the files to be compiled are written in. This is mostly
    # relevant for c++ headers.
    # For a C project, you would set this to 'c' instead of 'c++'.
    "-x",
    "c++",
    "-I",
    "include",
    "-isystem",
    "/usr/include",
    "-isystem",
    "/usr/local/include",
]


# Set this to the absolute path to the folder (NOT the file!) containing the
# compile_commands.json file to use that instead of 'flags'. See here for
# more details: http://clang.llvm.org/docs/JSONCompilationDatabase.html
#
# Most projects will NOT need to set this to anything; you can just change the
# 'flags' list of compilation flags. Notice that YCM itself uses that approach.
compilation_database_folder = ""

if os.path.exists(compilation_database_folder):
    database = ycm_core.CompilationDatabase(compilation_database_folder)
