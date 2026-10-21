# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_metrics.py
lines:445 exports:
---
import os

import pytest

from . import (
    make_dsn,
    run,
    Envelope,
    split_log_request_cond,
    is_metrics_envelope,
    SENTRY_VERSION,
)
from .assertions import (
    assert_event,
    assert_metrics,
)
from .conditions import has_http, has_breakpad, has_native, is_qemu

pytestmark = pytest.mark.skipif(not has_http, reason="tests need http")


def test_metrics_capture(cmake, httpserver):
    tmp_path = cmake(["sentry_example"], {"SENTRY_BACKEND": "none"})

    httpserver.expect_request("/api/123456/envelope/").respond_with_data("OK")
    env = dict(os.environ, SENTRY_DSN=make_dsn(httpserver))

    run(
        tmp_path,
        "sentry_example",
        ["log", "capture-metric"],
        env=env,
    )

    assert len(httpserver.log) == 1

    req = httpserver.log[0][0]
    body = req.get_data()

    envelope = Envelope.deserialize(body)
