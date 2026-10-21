# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_cache.py
lines:516 exports:
---
import os
import time
import pytest

from . import make_dsn, run, run_crash
from .assertions import wait_for, wait_for_file
from .conditions import has_breakpad, has_files, has_http, has_native, is_qemu

pytestmark = [
    pytest.mark.skipif(not has_files, reason="tests need local filesystem"),
    pytest.mark.skipif(not has_http, reason="tests need http transport"),
]


@pytest.mark.parametrize(
    "cache_args,expect_cache",
    [
        pytest.param([], False, id="none"),
        pytest.param(["cache-keep"], True, id="offline"),
        pytest.param(["cache-keep-always"], True, id="always"),
    ],
)
@pytest.mark.parametrize(
    "backend",
    [
        "inproc",
        pytest.param(
            "breakpad",
            marks=pytest.mark.skipif(
                not has_breakpad or is_qemu, reason="breakpad backend not available"
            ),
        ),
    ],
)
def test_cache_keep(cmake, backend, cache_args, expect_cache, unreachable_dsn):
    tmp_path = cmake(["sentry_example"], {"SENTRY_BACKEND": backend})
    cache_dir = tmp_path.joinpath(".sentry-native/cache")
    env = dict(os.environ, SENTRY_DSN=unreachable_dsn)

    # capture
