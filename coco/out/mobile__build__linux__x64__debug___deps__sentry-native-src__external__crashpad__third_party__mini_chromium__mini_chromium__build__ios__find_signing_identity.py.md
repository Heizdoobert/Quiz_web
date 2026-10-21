# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/ios/find_signing_identity.py
lines:92 exports:
---
# Copyright 2015 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from __future__ import print_function

import argparse
import os
import subprocess
import sys
import re


def Redact(value, from_nth_char=5):
    """Redact value past the N-th character."""
    return value[:from_nth_char] + '*' * (len(value) - from_nth_char)


class Identity(object):
    """Represents a valid identity."""

    def __init__(self, identifier, name, team):
        self.identifier = identifier
        self.name = name
        self.team = team

    def redacted(self):
        return Identity(Redact(self.identifier), self.name, Redact(self.team))

    def format(self):
        return '%s: "%s (%s)"' % (self.identifier, self.name, self.team)


def ListIdentities():
    return subprocess.check_output([
        'xcrun',
        'security',
        'find-identity',
        '-v',
        '-p',
