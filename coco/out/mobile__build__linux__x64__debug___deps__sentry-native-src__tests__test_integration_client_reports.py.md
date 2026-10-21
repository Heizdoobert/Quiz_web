# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_client_reports.py
lines:432 exports:
---
import os
import subprocess

import pytest

from . import make_dsn, run, Envelope
from .assertions import (
    assert_client_report,
    assert_event,
    assert_session,
)
from .conditions import has_files, has_http

pytestmark = pytest.mark.skipif(not has_http, reason="tests need http")


def test_client_report_none(cmake, httpserver):
    tmp_path = cmake(["sentry_example"], {"SENTRY_BACKEND": "none"})

    httpserver.expect_request("/api/123456/envelope/").respond_with_data("OK")
    env = dict(os.environ, SENTRY_DSN=make_dsn(httpserver))

    run(
        tmp_path,
        "sentry_example",
        ["log", "capture-event"],
        env=env,
    )

    assert len(httpserver.log) == 1
    envelope = Envelope.deserialize(httpserver.log[0][0].get_data())

    assert_event(envelope)
    for item in envelope:
        assert item.headers.get("type") != "client_report"


def test_client_report_before_send(cmake, httpserver):
    tmp_path = cmake(["sentry_example"], {"SENTRY_BACKEND": "none"})

