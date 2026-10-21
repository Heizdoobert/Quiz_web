# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_stress_inproc.py
lines:500 exports:
---
import os
import pathlib
import platform
import shutil
import subprocess
import sys
import time

import pytest

from . import adb, Envelope
from .assertions import assert_inproc_crash
from .build_config import get_test_executable_cmake_args, get_test_executable_env
from .conditions import is_android, is_tsan, is_wine

fixture_path = pathlib.Path("tests/fixtures/inproc_stress")

pytestmark = pytest.mark.skipif(
    is_wine, reason="inproc stress test harness does not support Wine"
)

ANDROID_TMP = "/data/local/tmp"


def compile_test_program(tmp_path):
    build_dir = tmp_path / "inproc_stress_build"
    build_dir.mkdir(exist_ok=True)

    source_dir = pathlib.Path(__file__).parent.parent.resolve()
    include_dir = source_dir / "include"

    cmake_args = get_test_executable_cmake_args(tmp_path, include_dir)
    cmake_args.append(str(fixture_path.resolve()))

    env = get_test_executable_env()

    subprocess.run(
        ["cmake"] + cmake_args,
        check=True,
        cwd=build_dir,
