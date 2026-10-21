# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_crashpad.py
lines:1344 exports:
---
import os
import struct
import subprocess
import sys
import time

import pytest
from flaky import flaky

from . import (
    make_dsn,
    run,
    stage_replay,
    Envelope,
    split_log_request_cond,
    extract_request,
    is_session_envelope,
    is_logs_envelope,
    is_feedback_envelope,
    is_replay_envelope,
    lib_name,
    REPLAY_ID,
)
from .conditions import has_crashpad, has_oom
from .proxy import (
    setup_proxy_env_vars,
    cleanup_proxy_env_vars,
    start_proxy,
    proxy_test_finally,
)
from .assertions import (
    assert_breadcrumb,
    assert_crashpad_upload,
    assert_meta,
    assert_minidump,
    assert_replay_envelope,
    assert_session,
    assert_gzip_file_header,
    assert_logs,
    assert_user_feedback,
