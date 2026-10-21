# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_proxy.py
lines:242 exports:
---
import os
import sys

import pytest

from . import (
    make_dsn,
    run,
)
from .assertions import (
    assert_failed_proxy_auth_request,
)
from .conditions import has_http, is_wine
from .proxy import (
    closed_port,
    start_proxy,
    proxy_test_finally,
)

pytestmark = pytest.mark.skipif(not has_http, reason="tests need http")


def _setup_http_proxy_test(
    cmake, httpserver, proxy, proxy_auth=None, listen_host="127.0.0.1"
):
    if proxy:
        proxy_process, port = start_proxy(proxy, proxy_auth, listen_host=listen_host)
    else:
        proxy_process, port = None, None

    tmp_path = cmake(["sentry_example"], {"SENTRY_BACKEND": "none"})

    env = dict(os.environ, SENTRY_DSN=make_dsn(httpserver, proxy_host=True))
    if port is not None:
        env["SENTRY_TEST_PROXY_PORT"] = str(port)
    httpserver.expect_request("/api/123456/envelope/").respond_with_data("OK")

    return env, proxy_process, tmp_path, port


