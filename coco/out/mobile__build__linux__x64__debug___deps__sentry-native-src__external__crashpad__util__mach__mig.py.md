# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/util/mach/mig.py
lines:101 exports:
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

import os
import shutil
import sys
import tempfile

import mig_fix
import mig_gen


def _try_remove(*paths):
    for path in paths:
        try:
            os.remove(path)
        except OSError:
            pass


def _generate_and_fix(user_c, server_c, user_h, server_h, defs, include, sdk,
                      clang_path, mig_path, migcom_path, arch):
    interface = mig_gen.MigInterface(user_c, server_c, user_h, server_h)
    mig_gen.generate_interface(defs, interface, include, sdk, clang_path,
                               mig_path, migcom_path, arch)
    mig_fix.fix_interface(interface)

