# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/assertions.py
lines:846 exports:
---
import email
import gzip
import json
import platform
import re
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, UTC
from pathlib import Path

import tests

import msgpack

from . import REPLAY_ID, SENTRY_VERSION
from .conditions import is_android, is_asan, is_tsan, is_wine

VERSION_RE = re.compile(r"(\d+\.\d+\.\d+)[-.]?(.*)")

INSTALLATION_ID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)


def matches(actual, expected):
    return {k: v for (k, v) in actual.items() if k in expected.keys()} == expected


def assert_matches(actual, expected):
    """Assert two objects for equality, ignoring extra keys in ``actual``."""
    assert {k: v for (k, v) in actual.items() if k in expected.keys()} == expected


def assert_session(
    envelope,
    extra_assertion=None,
    release="test-example-release",
    environment="development",
):
    session = None
