# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_integration_tus.py
lines:583 exports:
---
import json
import os
import threading

import pytest
from werkzeug.wrappers import Response

from . import (
    make_dsn,
    run,
    Envelope,
    SENTRY_VERSION,
)
from .assertions import assert_attachment
from .conditions import has_breakpad, has_files, has_http, has_native, is_qemu

pytestmark = [
    pytest.mark.skipif(not has_http, reason="tests need http transport"),
    pytest.mark.skipif(not has_files, reason="tests need local filesystem"),
]

# fmt: off
auth_header = (
    f"Sentry sentry_key=uiaeosnrtdy, sentry_version=7, sentry_client=sentry.native/{SENTRY_VERSION}"
)
# sentry <base64({"attachment_type":"event.minidump"})>
upload_metadata = "sentry eyJhdHRhY2htZW50X3R5cGUiOiJldmVudC5taW5pZHVtcCJ9"
# fmt: on


def test_tus_upload(cmake, httpserver):
    tmp_path = cmake(
        ["sentry_example"],
        {"SENTRY_BACKEND": "none"},
    )

    upload_uri = "/api/123456/upload/abc123def456789/"
    upload_qs = "length=104857600&signature=xyz"
    location = httpserver.url_for(upload_uri) + "?" + upload_qs

