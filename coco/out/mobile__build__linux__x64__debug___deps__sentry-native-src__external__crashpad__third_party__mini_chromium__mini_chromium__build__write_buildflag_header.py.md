# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/write_buildflag_header.py
lines:104 exports:
---
#!/usr/bin/env python

# Copyright 2015 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

# This writes headers for build flags. See buildflag_header.gni for usage of
# this system as a whole.
#
# The parameters are passed in a response file so we don't have to worry about
# command line lengths. The name of the response file is passed on the command
# line.
#
# The format of the response file is:
#    [--flags <list of one or more flag values>]

import optparse
import os
import shlex
import sys


class Options:

    def __init__(self, output, rulename, header_guard, flags):
        self.output = output
        self.rulename = rulename
        self.header_guard = header_guard
        self.flags = flags


def GetOptions():
    parser = optparse.OptionParser()
    parser.add_option('--output', help="Output header name inside --gen-dir.")
    parser.add_option('--rulename',
                      help="Helpful name of build rule for including in the " +
                      "comment at the top of the file.")
    parser.add_option('--gen-dir',
                      help="Path to root of generated file directory tree.")
    parser.add_option('--definitions',
