# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/ios/sdk_info.py
lines:179 exports:
---
#!/usr/bin/env python3

# Copyright 2014 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from __future__ import print_function

import argparse
import doctest
import itertools
import os
import plistlib
import subprocess
import sys

if sys.version_info.major < 3:
    basestring_compat = basestring
else:
    basestring_compat = str

# src directory
ROOT_SRC_DIR = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.dirname(
        os.path.realpath(__file__)))))

# This script prints information about the build system, the operating system
# and the iOS or Mac SDK (depending on the platform "iphonesimulator",
# "iphoneos" or "macosx" generally).


def LoadPList(path):
    """Loads Plist at |path| and returns it as a dictionary."""
    # Cloned from //build/apple/plist_util.py.
    if sys.version_info.major == 2:
        return plistlib.readPlist(path)
    with open(path, 'rb') as f:
        return plistlib.load(f)


