# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_screenshot.py
lines:189 exports:
---
import email
import gzip
import os
import shutil
import sys

import pytest

from . import Envelope, make_dsn, run


def assert_screenshot_file(database_path):
    run_dirs = [d for d in database_path.glob("*.run") if d.is_dir()]
    assert (
        len(run_dirs) == 1
    ), f"Expected exactly one .run directory, found {len(run_dirs)}"
    screenshot_path = run_dirs[0] / "screenshot.png"
    assert screenshot_path.exists(), "No screenshot was captured"
    assert screenshot_path.stat().st_size > 0, "Screenshot file is empty"


def assert_no_screenshot_file(database_path):
    run_dirs = [d for d in database_path.glob("*.run") if d.is_dir()]
    assert (
        len(run_dirs) == 1
    ), f"Expected exactly one .run directory, found {len(run_dirs)}"
    screenshot_path = run_dirs[0] / "screenshot.png"
    assert not screenshot_path.exists(), "Unexpected screenshot file was captured"


def assert_screenshot_envelope(envelope):
    found_screenshot = False
    for item in envelope.items:
        if (
            item.headers.get("type") == "attachment"
            and item.headers.get("filename") == "screenshot.png"
        ):
            assert item.headers.get("content_type") == "image/png"
            assert item.headers.get("attachment_type") == "event.attachment"
            assert len(item.payload.bytes) > 0
