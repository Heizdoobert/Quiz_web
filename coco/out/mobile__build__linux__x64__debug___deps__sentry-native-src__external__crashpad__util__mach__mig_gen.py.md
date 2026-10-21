# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/util/mach/mig_gen.py
lines:104 exports:
---
#!/usr/bin/env python3

# Copyright 2019 The Crashpad Authors
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
import collections
import os
import subprocess
import sys

MigInterface = collections.namedtuple(
    'MigInterface', ['user_c', 'server_c', 'user_h', 'server_h'])


def generate_interface(defs,
                       interface,
                       includes=[],
                       sdk=None,
                       clang_path=None,
                       mig_path=None,
                       migcom_path=None,
                       arch=None):
    if mig_path is None:
        mig_path = 'mig'

    # yapf: disable
    command = [
        mig_path,
