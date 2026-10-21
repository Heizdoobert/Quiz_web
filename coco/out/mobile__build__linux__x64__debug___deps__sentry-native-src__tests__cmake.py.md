# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/cmake.py
lines:377 exports:
---
import json
import os
import shutil
import subprocess
import sys
import platform
from pathlib import Path

import pytest

from . import adb, exe_name, lib_name
from .conditions import has_sccache
from .build_config import (
    get_android_config,
    get_platform_cmake_args,
    get_cflags,
    get_tsan_env,
)


class CMake:
    def __init__(self, factory):
        self.runs = dict()
        self.factory = factory

    def compile(self, targets, options=None, cflags=None):
        # We build in tmp for all of our tests. Disable the warning MSVC generates to not clutter the build logs.
        if cflags is None:
            cflags = []
        if sys.platform == "win32":
            os.environ["IgnoreWarnIntDirInTempDetected"] = "True"

        if options is None:
            options = dict()
        key = ";".join(f"{k}={v}" for k, v in options.items())
        if cflags:
            key += ";" + ";".join(cflags)

        # cache the build configuration
        if key not in self.runs:
