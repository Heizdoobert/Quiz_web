# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/find_mac_sdk.py
lines:171 exports:
---
#!/usr/bin/env python
# coding: utf-8

# Copyright 2012 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from __future__ import print_function

import argparse
import os
import re
import subprocess
import sys
import textwrap


def _AsVersion(version_str):
    return tuple((int(s) for s in re.findall(r'(\d+)', version_str)))


def _RunXCRun(args, sdk=None):
    xcrun_args = ['xcrun']
    if sdk is not None:
        xcrun_args.extend(['--sdk', sdk])
    xcrun_args.extend(args)
    return subprocess.check_output(xcrun_args).decode('utf-8').rstrip()


def _SDKPath(sdk=None):
    return _RunXCRun(['--show-sdk-path'], sdk)


def _SDKVersion(sdk=None):
    return _AsVersion(_RunXCRun(['--show-sdk-version'], sdk))


class DidNotMeetCriteria(Exception):
    pass

