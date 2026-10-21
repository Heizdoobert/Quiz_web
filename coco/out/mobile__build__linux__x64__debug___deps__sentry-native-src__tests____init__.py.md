# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/__init__.py
lines:502 exports:
---
import gzip
import subprocess
import os
import io
import json
import sys
import time
import urllib
import pytest
import pprint
import textwrap
import socket

sourcedir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))


def lib_name(name):
    if sys.platform == "win32":
        prefix = "lib" if os.environ.get("TEST_MINGW") else ""
        return prefix + name + ".dll"
    elif sys.platform == "darwin":
        return "lib" + name + ".dylib"
    return "lib" + name + ".so"


def adb(*args, **kwargs):
    return subprocess.run(
        ["{}/platform-tools/adb".format(os.environ["ANDROID_HOME"]), *args], **kwargs
    )


def exe_name(name):
    if sys.platform == "win32" or os.environ.get("TEST_WINE"):
        return f"{name}.exe"
    return name


def run_command(name):
    name = exe_name(name)
    if os.environ.get("TEST_WINE"):
