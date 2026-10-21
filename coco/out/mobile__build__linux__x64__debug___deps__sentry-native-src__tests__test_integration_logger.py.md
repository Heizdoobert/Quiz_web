# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_logger.py
lines:197 exports:
---
import shutil
import subprocess
import sys
import re

import pytest

import os

from . import run
from .conditions import has_breakpad, has_crashpad, has_native, is_android, is_qemu


def _run_logger_crash_test(backend, cmake, logger_option):
    """Helper function to run logger crash tests with the specified logger option.

    Args:
        backend: The sentry backend to use (inproc, breakpad, crashpad)
        cmake: The cmake fixture
        logger_option: Either 'enable-logger-when-crashed' or 'disable-logger-when-crashed'

    Returns:
        tuple: (output, parsed_data) where output is the raw subprocess output
               and parsed_data is the parsed logging data
    """
    tmp_path = cmake(
        ["sentry_example"], {"SENTRY_BACKEND": backend, "SENTRY_TRANSPORT": "none"}
    )

    # Run the example with the specified logger option - expect it to crash
    child = run(
        tmp_path,
        "sentry_example",
        [
            logger_option,  # enable or disable logging during crash
            "log",  # Enable debug logging
            "test-logger",  # Use our custom test logger
            "test-logger-before-crash",  # Log before crash
            "crash",  # Trigger crash
        ],
