# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/ios/codesign.py
lines:726 exports:
---
# Copyright 2016 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from __future__ import print_function

import argparse
import codecs
import datetime
import fnmatch
import glob
import json
import os
import plistlib
import shutil
import subprocess
import sys
import tempfile

if sys.version_info.major < 3:
    basestring_compat = basestring
else:
    basestring_compat = str


def GetProvisioningProfilesDir():
    """Returns the location of the installed mobile provisioning profiles.

    Returns:
        The path to the directory containing the installed mobile provisioning
        profiles as a string.
    """
    return os.path.join(os.environ['HOME'], 'Library', 'MobileDevice',
                        'Provisioning Profiles')


def ReadPlistFromString(plist_bytes):
    """Parse property list from given |plist_bytes|.

    Args:
