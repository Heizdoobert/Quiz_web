# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/build/ios/convert_gn_xcodeproj.py
lines:559 exports:
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
"""Convert GN Xcode projects to platform and configuration independent targets.

GN generates Xcode projects that build one configuration only. However, typical
iOS development involves using the Xcode IDE to toggle the platform and
configuration. This script replaces the 'gn' configuration with 'Debug',
'Release' and 'Profile', and changes the ninja invocation to honor these
configurations.
"""

import argparse
import collections
import copy
import filecmp
import functools
import hashlib
import io
import json
import os
import re
import shutil
import string
import subprocess
import sys
import tempfile
import xml.etree.ElementTree
