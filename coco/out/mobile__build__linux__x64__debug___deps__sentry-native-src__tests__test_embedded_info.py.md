# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_embedded_info.py
lines:249 exports:
---
import os
import shutil
import subprocess
import pytest
from . import run, SENTRY_VERSION
from .conditions import has_http

has_strings = shutil.which("strings") is not None


def test_embedded_info_enabled(cmake):
    """Test that version embedding works when enabled"""
    cwd = cmake(
        ["sentry_test_unit"],
        {
            "SENTRY_BACKEND": "none",
            "SENTRY_TRANSPORT": "none",
            "SENTRY_EMBED_INFO": "ON",
            "SENTRY_BUILD_PLATFORM": "test-platform",
            "SENTRY_BUILD_VARIANT": "pytest",
            "SENTRY_BUILD_ID": "test-build-123",
            "SENTRY_EMBED_INFO_ITEMS": "TEST:python;FRAMEWORK:pytest;",
        },
    )

    # Run the embedded info tests
    env = dict(os.environ)

    # Test basic functionality
    run(
        cwd,
        "sentry_test_unit",
        ["--no-summary", "embedded_info_basic"],
        env=env,
    )

    # Test format validation
    run(
        cwd,
        "sentry_test_unit",
