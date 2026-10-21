# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_macos_sandbox.py
lines:294 exports:
---
"""
Integration tests for the native backend running inside macOS App Sandbox.

Verifies that the sandbox-safe IPC (file-backed mmap, pthread mutex,
posix_spawn) works correctly when com.apple.security.app-sandbox is enabled.
"""

import os
import sys
import plistlib
import shutil
import struct
import subprocess
import tempfile
import textwrap

import pytest

from . import make_dsn, Envelope
from .assertions import wait_for_file
from .conditions import has_native

pytestmark = pytest.mark.skipif(
    not (has_native and sys.platform == "darwin"),
    reason="macOS App Sandbox tests require native backend on macOS",
)


def _create_sandbox_app_bundle(tmp_path, exe_name="sentry_example"):
    """
    Create a minimal .app bundle with App Sandbox entitlements around
    the already-built executable and its companion sentry-crash daemon.

    Returns the path to the executable inside the bundle.
    """
    app_dir = os.path.join(str(tmp_path), "SentryTest.app")
    contents_dir = os.path.join(app_dir, "Contents")
    macos_dir = os.path.join(contents_dir, "MacOS")
    os.makedirs(macos_dir, exist_ok=True)

