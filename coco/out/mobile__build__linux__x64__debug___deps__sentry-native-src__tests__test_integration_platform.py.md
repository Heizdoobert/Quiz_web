# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_platform.py
lines:63 exports:
---
import os

import pytest

from . import Envelope, SENTRY_VERSION, make_dsn, run
from .conditions import has_http

pytestmark = pytest.mark.skipif(not has_http, reason="tests need http transport")


def test_platform_integration(cmake, httpserver):
    cwd = cmake(
        ["sentry_test_platform"],
        {
            "SENTRY_BACKEND": "none",
            "SENTRY_BUILD_SHARED_LIBS": "OFF",
            "SENTRY_INTEGRATION_PLATFORM": "ON",
        },
    )

    httpserver.expect_oneshot_request("/api/123456/envelope/").respond_with_data("OK")

    run(
        cwd,
        "sentry_test_platform",
        [],
        env=dict(os.environ, SENTRY_DSN=make_dsn(httpserver)),
    )

    assert len(httpserver.log) == 1
    envelope = Envelope.deserialize(httpserver.log[0][0].get_data())

    (item,) = envelope.items
    assert item.headers["type"] == "event"
    event = item.payload.json

    # SDK
    assert event["platform"] == "native"
    assert event["environment"] == "production"
    assert event["event_id"]
