# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_logs.py
lines:460 exports:
---
import os

import pytest

from . import (
    make_dsn,
    run,
    Envelope,
    split_log_request_cond,
    is_logs_envelope,
    SENTRY_VERSION,
)
from .assertions import (
    assert_event,
    assert_logs,
)
from .conditions import has_http, has_breakpad, has_native, is_qemu

pytestmark = pytest.mark.skipif(not has_http, reason="tests need http")


def test_logs_timer(cmake, httpserver):
    tmp_path = cmake(["sentry_example"], {"SENTRY_BACKEND": "none"})

    httpserver.expect_request("/api/123456/envelope/").respond_with_data("OK")

    run(
        tmp_path,
        "sentry_example",
        ["log", "logs-timer"],
        env=dict(os.environ, SENTRY_DSN=make_dsn(httpserver)),
    )

    assert len(httpserver.log) == 2

    req_0 = httpserver.log[0][0]
    body_0 = req_0.get_data()

    envelope_0 = Envelope.deserialize(body_0)
    assert_logs(envelope_0, 10)
