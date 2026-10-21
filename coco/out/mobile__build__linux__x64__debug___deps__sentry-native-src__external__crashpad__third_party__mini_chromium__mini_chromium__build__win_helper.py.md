# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/third_party/mini_chromium/mini_chromium/build/win_helper.py
lines:256 exports:
---
# Copyright 2017 The Chromium Authors
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

import winreg
import os
import re
import subprocess
import sys


def _RegistryGetValue(key, value):
    """Use the winreg module to obtain the value of a registry key.

    Args:
        key: The registry key.
        value: The particular registry value to read.
    Return:
        contents of the registry key's value, or None on failure.
    """
    try:
        root, subkey = key.split('\\', 1)
        assert root == 'HKLM'  # Only need HKLM for now.
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, subkey) as hkey:
            return winreg.QueryValueEx(hkey, value)[0]
    except WindowsError:
        return None


def _ExtractImportantEnvironment(output_of_set):
    """Extracts environment variables required for the toolchain to run from
    a textual dump output by the cmd.exe 'set' command."""
    envvars_to_save = (
        'include',
        'lib',
        'libpath',
        'path',
        'pathext',
        'systemroot',
        'temp',
