# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/proxy_server.py
lines:373 exports:
---
"""Simple, lightweight, dependency-free mitmdump replacement for proxy tests."""

import argparse
import base64
import select
import socket
import sys
import threading
from urllib.parse import urlsplit

BUFFER_SIZE = 64 * 1024
HEADER_LIMIT = 1024 * 1024
SOCKS_VERSION = 5


class ProxyError(Exception):
    pass


def _recv_exact(sock, size):
    data = b""
    while len(data) < size:
        chunk = sock.recv(size - len(data))
        if not chunk:
            raise ProxyError("unexpected EOF")
        data += chunk
    return data


def _recv_until(sock, marker, limit=HEADER_LIMIT):
    data = b""
    while marker not in data:
        chunk = sock.recv(BUFFER_SIZE)
        if not chunk:
            raise ProxyError("unexpected EOF")
        data += chunk
        if len(data) > limit:
            raise ProxyError("header too large")
    return data

