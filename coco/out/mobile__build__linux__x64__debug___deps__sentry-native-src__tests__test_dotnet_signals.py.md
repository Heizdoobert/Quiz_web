# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_dotnet_signals.py
lines:550 exports:
---
import os
import pathlib
import shutil
import subprocess
import sys
import time

import pytest

from tests import adb
from tests.assertions import wait_for
from tests.conditions import (
    has_native,
    is_android,
    is_arm32,
    is_tsan,
    is_wine,
    is_x86,
    is_asan,
)

project_fixture_path = pathlib.Path("tests/fixtures/dotnet_signal")

pytestmark = pytest.mark.skipif(
    is_wine, reason=".NET signal tests do not support Windows targets under Wine"
)


def assert_empty_run_dir(database_path):
    run_dirs = [d for d in database_path.glob("*.run") if d.is_dir()]
    assert (
        len(run_dirs) > 0
    ), f"Expected at least one .run directory, found {len(run_dirs)}"
    assert not list(
        database_path.glob("**/*.envelope")
    ), "Unexpected crash envelope found"


def assert_run_dir_with_envelope(database_path):
    run_dirs = [d for d in database_path.glob("*.run") if d.is_dir()]
