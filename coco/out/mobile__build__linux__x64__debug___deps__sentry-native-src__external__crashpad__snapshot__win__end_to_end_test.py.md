# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/snapshot/win/end_to_end_test.py
lines:581 exports:
---
#!/usr/bin/env python3

# Copyright 2015 The Crashpad Authors
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

import os
import platform
import pywintypes
import random
import re
import struct
import subprocess
import sys
import tempfile
import time
import win32con
import win32pipe
import winerror

g_temp_dirs = []
g_had_failures = False


def MakeTempDir():
    global g_temp_dirs
    new_dir = tempfile.mkdtemp()
    g_temp_dirs.append(new_dir)
    return new_dir

