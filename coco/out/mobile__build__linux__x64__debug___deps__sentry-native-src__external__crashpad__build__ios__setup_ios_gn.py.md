# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/build/ios/setup_ios_gn.py
lines:417 exports:
---
#!/usr/bin/env python3

# Copyright 2020 The Crashpad Authors
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import argparse
import configparser
import convert_gn_xcodeproj
import errno
import io
import os
import platform
import re
import shutil
import subprocess
import sys
import tempfile


SUPPORTED_TARGETS = ('appletvos', 'appletvsimulator', 'iphoneos',
                     'iphonesimulator', 'maccatalyst')
SUPPORTED_CONFIGS = ('Debug', 'Release', 'Profile', 'Official')

# Pattern matching lines from ~/.lldbinit that must not be copied to the
# generated .lldbinit file. They match what the user were told to add to
# their global ~/.lldbinit file before setup-gn.py was updated to generate
# a project specific file and thus must not be copied as they would cause
# the settings to be overwritten.
LLDBINIT_SKIP_PATTERNS = (
