# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_e2e_sentry.py
lines:829 exports:
---
"""
End-to-end integration tests that verify Sentry receives crash events.

These tests send real crash events to Sentry and verify they arrive with
the expected structure for all crash backends and native crash reporting modes.

Requires environment variables:
- SENTRY_E2E_DSN: Sentry test project DSN
- SENTRY_E2E_AUTH_TOKEN: Sentry API token with project:read scope
- SENTRY_E2E_ORG: Sentry organization slug
- SENTRY_E2E_PROJECT: Sentry project slug

Skip these tests if env vars not set (for regular CI runs).
"""

import os
import re
import subprocess
import sys
import time
from urllib.parse import urlsplit, urlunsplit

import pytest
import requests

from . import run, check_output
from .conditions import (
    has_breakpad,
    has_crashpad,
    has_http,
    has_native,
    is_asan,
)

# Skip all tests if E2E env vars not configured
pytestmark = [
    pytest.mark.skipif(
        not os.environ.get("SENTRY_E2E_DSN"),
        reason="E2E tests require SENTRY_E2E_DSN environment variable",
    ),
