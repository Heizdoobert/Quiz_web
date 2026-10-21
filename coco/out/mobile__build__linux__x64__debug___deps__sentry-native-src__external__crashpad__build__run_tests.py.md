# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/build/run_tests.py
lines:501 exports:
---
#!/usr/bin/env python3

# Copyright 2014 The Crashpad Authors
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
import os
import posixpath
import re
import shlex
import subprocess
import sys
import tempfile
import uuid

CRASHPAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            os.pardir)
IS_WINDOWS_HOST = sys.platform.startswith('win')


def _FindGNFromBinaryDir(binary_dir):
    """Attempts to determine the path to a GN binary used to generate the build
    files in the given binary_dir. This is necessary because `gn` might not be
    in the path or might be in a non-standard location, particularly on build
    machines."""

    build_ninja = os.path.join(binary_dir, 'build.ninja')
    if os.path.isfile(build_ninja):
        with open(build_ninja, 'r') as f:
