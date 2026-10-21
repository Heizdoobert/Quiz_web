# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/tools/gbench/util.py
lines:229 exports:
---
"""util.py - General utilities for running, loading, and processing
benchmarks
"""

import json
import os
import re
import subprocess
import sys
import tempfile

# Input file type enumeration
IT_Invalid = 0
IT_JSON = 1
IT_Executable = 2

_num_magic_bytes = 2 if sys.platform.startswith("win") else 4


def is_executable_file(filename):
    """
    Return 'True' if 'filename' names a valid file which is likely
    an executable. A file is considered an executable if it starts with the
    magic bytes for a EXE, Mach O, or ELF file.
    """
    if not os.path.isfile(filename):
        return False
    with open(filename, mode="rb") as f:
        magic_bytes = f.read(_num_magic_bytes)
    if sys.platform == "darwin":
        return magic_bytes in [
            b"\xfe\xed\xfa\xce",  # MH_MAGIC
            b"\xce\xfa\xed\xfe",  # MH_CIGAM
            b"\xfe\xed\xfa\xcf",  # MH_MAGIC_64
            b"\xcf\xfa\xed\xfe",  # MH_CIGAM_64
            b"\xca\xfe\xba\xbe",  # FAT_MAGIC
            b"\xbe\xba\xfe\xca",  # FAT_CIGAM
        ]
    elif sys.platform.startswith("win"):
        return magic_bytes == b"MZ"
