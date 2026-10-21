# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_transactions.py
lines:561 exports:
---
import os
import time
import uuid

import pytest

from . import (
    make_dsn,
    run,
    Envelope,
    SENTRY_VERSION,
)
from .assertions import (
    assert_meta,
    assert_event,
    assert_gzip_content_encoding,
    assert_gzip_file_header,
)
from .conditions import has_http

pytestmark = pytest.mark.skipif(not has_http, reason="tests need http")

RFC3339_FORMAT = "%Y-%m-%dT%H:%M:%S.%fZ"
UPSTREAM_TRACE_ID = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
UPSTREAM_PARENT_SPAN_ID = "bbbbbbbbbbbbbbbb"


@pytest.mark.parametrize(
    "build_args",
    [
        ({}),  # SENTRY_TRANSPORT_COMPRESSION=Off (default, cached)
        ({"SENTRY_TRANSPORT_COMPRESSION": "On"}),
    ],
)
def test_transaction_only(cmake, httpserver, build_args):
    build_args.update({"SENTRY_BACKEND": "none"})
    tmp_path = cmake(["sentry_example"], build_args)

    httpserver.expect_oneshot_request("/api/123456/envelope/").respond_with_data("OK")
    env = dict(os.environ, SENTRY_DSN=make_dsn(httpserver), SENTRY_RELEASE="🤮🚀")
