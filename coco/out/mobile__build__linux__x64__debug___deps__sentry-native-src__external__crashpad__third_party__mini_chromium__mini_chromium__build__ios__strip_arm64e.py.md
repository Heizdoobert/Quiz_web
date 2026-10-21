# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/ios/strip_arm64e.py
lines:72 exports:
---
# Copyright 2020 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

"""Strip arm64e architecture from a binary if present."""

import argparse
import os
import shutil
import subprocess
import sys


def check_output(command):
    """Returns the output from |command| or propagates error, quitting
    script."""
    process = subprocess.Popen(command,
                               stdout=subprocess.PIPE,
                               stderr=subprocess.PIPE)
    outs, errs = process.communicate()
    if process.returncode:
        sys.stderr.write('error: command failed with retcode %d: %s\n\n' %
                         (process.returncode, ' '.join(map(repr, command))))
        sys.stderr.write(errs.decode('UTF-8', errors='ignore'))
        sys.exit(process.returncode)
    return outs.decode('UTF-8')


def check_call(command):
    """Invokes |command| or propagates error."""
    check_output(command)


def parse_args(args):
    """Parses the command-line."""
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Path to input binary')
    parser.add_argument('--output', required=True, help='Path to output binary')
    return parser.parse_args(args)

