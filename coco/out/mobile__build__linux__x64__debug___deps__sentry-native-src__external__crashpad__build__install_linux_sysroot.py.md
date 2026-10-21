# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/build/install_linux_sysroot.py
lines:74 exports:
---
#!/usr/bin/env python3

# Copyright 2018 The Crashpad Authors
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

# Various code adapted from:
# https://cs.chromium.org/chromium/src/build/linux/sysroot_scripts/install-sysroot.py

import os
import shutil
import subprocess
import sys
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Sysroot revision from:
# https://cs.chromium.org/chromium/src/build/linux/sysroot_scripts/sysroots.json
SERVER = 'https://commondatastorage.googleapis.com'
PATH = 'chrome-linux-sysroot/toolchain'
REVISION = '43a87bbebccad99325fdcf34166295b121ee15c7'
FILENAME = 'debian_sid_amd64_sysroot.tar.xz'


def main():
    url = '%s/%s/%s/%s' % (SERVER, PATH, REVISION, FILENAME)

    sysroot = os.path.join(SCRIPT_DIR, os.pardir, 'third_party', 'linux',
                           'sysroot')
