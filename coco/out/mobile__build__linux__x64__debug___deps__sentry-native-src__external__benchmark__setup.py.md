# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/setup.py
lines:166 exports:
---
import contextlib
import os
import platform
import re
import shutil
import sys
from collections.abc import Generator
from pathlib import Path
from typing import Any

import setuptools
from setuptools.command import build_ext

IS_WINDOWS = platform.system() == "Windows"
IS_MAC = platform.system() == "Darwin"
IS_LINUX = platform.system() == "Linux"

# hardcoded SABI-related options. Requires that each Python interpreter
# (hermetic or not) participating is of the same major-minor version.
py_limited_api = sys.version_info >= (3, 12)
options = {"bdist_wheel": {"py_limited_api": "cp312"}} if py_limited_api else {}


def is_cibuildwheel() -> bool:
    return os.getenv("CIBUILDWHEEL") is not None


@contextlib.contextmanager
def _maybe_patch_toolchains() -> Generator[None, None, None]:
    """
    Patch rules_python toolchains to ignore root user error
    when run in a Docker container on Linux in cibuildwheel.
    """

    def fmt_toolchain_args(matchobj):
        suffix = "ignore_root_user_error = True"
        callargs = matchobj.group(1)
        # toolchain def is broken over multiple lines
        if callargs.endswith("\n"):
            callargs = callargs + "    " + suffix + ",\n"
