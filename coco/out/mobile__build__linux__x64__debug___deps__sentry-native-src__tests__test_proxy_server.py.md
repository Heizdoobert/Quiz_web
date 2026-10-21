# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_proxy_server.py
lines:220 exports:
---
import base64
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import queue
import socket
import subprocess
import sys
import threading
import time

import pytest


class _RequestHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self):
        if self.path == "/through-socks":
            self.server.response_gate.wait(timeout=5)
        self._respond(b"")

    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        self._respond(body)

    def _respond(self, body):
        self.server.requests.put(
            (self.command, self.path, dict(self.headers.items()), body)
        )
        self.send_response(200)
        self.send_header("Content-Length", "2")
        self.send_header("Connection", "close")
        self.end_headers()
        self.wfile.write(b"OK")

    def log_message(self, format, *args):
        pass


@pytest.fixture
