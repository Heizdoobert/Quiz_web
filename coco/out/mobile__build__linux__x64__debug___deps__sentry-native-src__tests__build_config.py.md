# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/build_config.py
lines:210 exports:
---
"""
Build configuration utilities for sentry-native tests.

This module provides shared logic for reading environment variables and
preparing CMake build parameters, used by both cmake.py (for building
example, library and backend artifacts) and individual tests that need
to build additional executables (like the inproc stress test) but still
need to align with the core artifacts.

This should make it much easier to add additional integration tests that
we no longer want to bloat example.c with.
"""

import os
import shutil
import sys
from pathlib import Path


def get_android_config():
    """
    Returns Android toolchain CMake options if ANDROID_API and ANDROID_NDK
    environment variables are set.
    """
    if not (os.environ.get("ANDROID_API") and os.environ.get("ANDROID_NDK")):
        return {}

    toolchain = "{}/ndk/{}/build/cmake/android.toolchain.cmake".format(
        os.environ["ANDROID_HOME"], os.environ["ANDROID_NDK"]
    )
    return {
        "CMAKE_TOOLCHAIN_FILE": toolchain,
        "ANDROID_ABI": os.environ.get("ANDROID_ARCH") or "x86",
        "ANDROID_NATIVE_API_LEVEL": os.environ["ANDROID_API"],
    }


def get_platform_cmake_args():
    """
    Returns a list of CMake command-line arguments based on platform and
