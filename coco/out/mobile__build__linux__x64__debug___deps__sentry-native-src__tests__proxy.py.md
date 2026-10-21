# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/proxy.py
lines:146 exports:
---
import contextlib
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time

import pytest

from tests.assertions import assert_no_proxy_request, wait_for, wait_for_stdout


@contextlib.contextmanager
def closed_port():
    """Bind a port and hold it open without listening.
    Connections are guaranteed to be refused, and no other process can claim it."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        yield s.getsockname()[1]


def setup_proxy_env_vars(port):
    os.environ["http_proxy"] = f"http://127.0.0.1:{port}"
    os.environ["https_proxy"] = f"http://127.0.0.1:{port}"


def cleanup_proxy_env_vars():
    os.environ.pop("http_proxy", None)
    os.environ.pop("https_proxy", None)


def _wait_for_output_file(process, output_file, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            stdout, _ = process.communicate(timeout=1)
            raise RuntimeError(
                "test proxy exited with code {} before listening:\n{}".format(
