# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_stdout.py
lines:423 exports:
---
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

from . import check_output, run, run_command, Envelope
from .assertions import (
    assert_attachment,
    assert_meta,
    assert_breadcrumb,
    assert_stacktrace,
    assert_event,
    assert_inproc_crash,
    assert_minidump,
    assert_before_send,
    assert_no_before_send,
    assert_crash_timestamp,
    assert_breakpad_crash,
    assert_exception,
    wait_for,
)
from .conditions import has_breakpad, has_files, is_qemu, is_wine


@pytest.mark.skipif(is_qemu, reason="unreliable under qemu-user")
@pytest.mark.xfail(
    bool(os.environ.get("TEST_MINGW")),
    reason="DbgHelp cannot read MinGW DWARF symbols",
    raises=pytest.RaisesExc(AssertionError, match="^missing symbolicated frames"),
    strict=True,
)
def test_capture_stdout(cmake):
    tmp_path = cmake(
        ["sentry_example"],
        {
            "SENTRY_BACKEND": "none",
            "SENTRY_TRANSPORT": "none",
