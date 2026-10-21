# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/ios/plist_util.py
lines:273 exports:
---
# Copyright 2016 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import argparse
import codecs
import plistlib
import os
import re
import subprocess
import sys
import tempfile

if sys.version_info.major < 3:
    basestring_compat = basestring
else:
    basestring_compat = str

# Xcode substitutes variables like ${PRODUCT_NAME} or $(PRODUCT_NAME) when
# compiling Info.plist. It also supports supports modifiers like :identifier or
# :rfc1034identifier. SUBSTITUTION_REGEXP_LIST is a list of regular expressions
# matching a variable substitution pattern with an optional modifier, while
# INVALID_CHARACTER_REGEXP matches all characters that are not valid in an
# "identifier" value (used when applying the modifier).
INVALID_CHARACTER_REGEXP = re.compile(r'[_/\s]')
SUBSTITUTION_REGEXP_LIST = (
    re.compile(r'\$\{(?P<id>[^}]*?)(?P<modifier>:[^}]*)?\}'),
    re.compile(r'\$\((?P<id>[^}]*?)(?P<modifier>:[^}]*)?\)'),
)


class SubstitutionError(Exception):

    def __init__(self, key):
        super(SubstitutionError, self).__init__()
        self.key = key

    def __str__(self):
        return "SubstitutionError: {}".format(self.key)

