# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/test_build_static.py
lines:137 exports:
---
import subprocess
import sys
import os
import pytest
from .conditions import (
    has_breakpad,
    has_crashpad,
    has_native,
    is_android,
    is_qemu,
    is_wine,
)


def test_static_lib(cmake):
    tmp_path = cmake(
        ["sentry_example"],
        {
            "SENTRY_BACKEND": "none",
            "SENTRY_TRANSPORT": "none",
            "BUILD_SHARED_LIBS": "OFF",
        },
    )

    # on linux we can use `ldd` to check that we don’t link to `libsentry.so`
    if sys.platform == "linux" and not is_android and not is_qemu and not is_wine:
        output = subprocess.check_output("ldd sentry_example", cwd=tmp_path, shell=True)
        assert b"libsentry.so" not in output

    # on windows, we read the file header to check that the exe is compiled correctly
    if sys.platform == "win32" or is_wine:
        with open(os.path.join(tmp_path, "sentry_example.exe"), "rb") as binary:
            binary.seek(0x3C, 0)
            offset = int.from_bytes(binary.read(4), byteorder="little")
            binary.seek(offset, 0)
            magic = binary.read(6)
            # https://docs.microsoft.com/en-us/windows/win32/debug/pe-format#signature-image-only
            if os.environ.get("TEST_X86"):
                expected = b"PE\x00\x00\x4c\x01"  # IMAGE_FILE_MACHINE_I386
            elif os.environ.get("PROCESSOR_ARCHITECTURE") == "ARM64":
