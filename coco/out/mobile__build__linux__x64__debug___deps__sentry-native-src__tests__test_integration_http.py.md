# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_http.py
lines:1671 exports:
---
import itertools
import json
import os
import subprocess
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
    is_feedback_envelope,
    is_replay_envelope,
    REPLAY_ID,
    SENTRY_VERSION,
)
from .assertions import (
    assert_attachment,
    assert_meta,
    assert_breadcrumb,
    assert_stacktrace,
    assert_event,
    assert_exception,
    assert_inproc_crash,
    assert_replay_envelope,
    assert_session,
    assert_user_feedback,
    assert_user_report,
    assert_minidump,
    assert_breakpad_crash,
    assert_gzip_content_encoding,
    assert_gzip_file_header,
    assert_attachment_view_hierarchy,
    assert_before_breadcrumb,
    assert_no_breadcrumbs,
