# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_native.py
lines:1568 exports:
---
"""
Integration tests for the native crash backend.

Tests crash handling, minidump generation, Build ID/UUID extraction,
multi-thread capture, and FPU/SIMD register capture on all platforms.
"""

import json
import os
import subprocess
import sys
import time
import struct

import pytest

from . import (
    is_feedback_envelope,
    is_replay_envelope,
    lib_name,
    make_dsn,
    run,
    run_crash,
    stage_replay,
    run_command,
    Envelope,
    split_log_request_cond,
    REPLAY_ID,
)
from .assertions import (
    assert_breadcrumb,
    assert_debug_meta_images_do_not_overlap,
    assert_meta,
    assert_native_crash,
    assert_replay_envelope,
    assert_session,
    is_valid_hex,
    wait_for,
    wait_for_file,
    assert_user_feedback,
