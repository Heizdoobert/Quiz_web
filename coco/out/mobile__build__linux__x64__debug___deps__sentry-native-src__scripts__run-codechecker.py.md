# mobile/build/linux/x64/debug/_deps/sentry-native-src/scripts/run-codechecker.py
lines:81 exports:
---
#!/usr/bin/env python3

import json
import os
import subprocess
from pathlib import Path

BACKENDS = ("none", "inproc", "breakpad", "crashpad", "native")
PROJECT_DIR = Path(__file__).resolve().parent.parent
BUILD_ROOT = PROJECT_DIR / "build" / "codechecker"


def run(command, *, check=True):
    print("+ {}".format(" ".join(map(str, command))), flush=True)
    return subprocess.run(command, cwd=PROJECT_DIR, check=check)


def main():
    run(["CodeChecker", "version"])

    compilation = []

    for backend in BACKENDS:
        build_dir = BUILD_ROOT / backend
        run(
            [
                "cmake",
                "-S",
                PROJECT_DIR,
                "-B",
                build_dir,
                "-DCMAKE_BUILD_TYPE=Debug",
                "-DCMAKE_EXPORT_COMPILE_COMMANDS=ON",
                "-DSENTRY_BUILD_EXAMPLES=OFF",
                "-DSENTRY_BUILD_TESTS=OFF",
                "-DSENTRY_BACKEND={}".format(backend),
            ]
        )
        run(["cmake", "--build", build_dir, "--target", "sentry", "--parallel"])

