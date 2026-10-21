# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_wer.py
lines:462 exports:
---
import ctypes
from ctypes import wintypes
import base64
import os
import re
import subprocess
import sys

from pathlib import Path

import pytest

from . import Envelope, make_dsn, run
from .assertions import (
    assert_breakpad_crash,
    assert_crashpad_upload,
    assert_event_meta,
    assert_inproc_crash,
    assert_minidump,
    assert_native_crash,
    wait_for,
)
from .conditions import has_breakpad, has_crashpad, has_native, is_qemu

pytestmark = [
    pytest.mark.skipif(
        sys.platform != "win32" or bool(os.environ.get("TEST_MINGW")),
        reason="WER integration tests are only available in MSVC Windows builds",
    ),
    pytest.mark.with_wer,
]

S_OK = 0
APPX_PACKAGE_NAME = "SentryNativeExample"
APPX_ACTIVITY_ID_RE = re.compile(r"ActivityId[:\s]+([0-9a-fA-F-]{36})", re.IGNORECASE)

E_STORE_USER_ARCHIVE = 0
E_STORE_USER_QUEUE = 1
E_STORE_MACHINE_ARCHIVE = 2
E_STORE_MACHINE_QUEUE = 3
