# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/conftest.py
lines:271 exports:
---
import json
import os
import subprocess
import pytest
import re
import statistics
import sys
import socket
import struct
import threading
from datetime import datetime, timedelta, UTC
from . import adb, run
from .cmake import CMake
from .conditions import has_sccache, is_android, is_wine
import tests

LABEL = "label"
TIME_UNIT = "time_unit"
REAL_TIME = "real_time"
CPU_TIME = "cpu_time"
VALUE = "value"
EXTRA = "extra"
RANGE = "range"

gbenchmarks = {}


def enumerate_unittests():
    regexp = re.compile(r"XX\((.*?)\)")
    # TODO: actually generate the `tests.inc` file with python
    curdir = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(curdir, "unit/tests.inc"), "r") as testsfile:
        for line in testsfile:
            match = regexp.match(line)
            if match:
                yield match.group(1)


def pytest_generate_tests(metafunc):
    if "unittest" in metafunc.fixturenames:
