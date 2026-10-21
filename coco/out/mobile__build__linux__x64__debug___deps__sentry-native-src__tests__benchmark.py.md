# mobile/build/linux/x64/debug/_deps/sentry-native-src/tests/benchmark.py
lines:171 exports:
---
import os
import shutil
import subprocess
import sys

import pytest

from . import lib_name, make_dsn, run
from .conditions import has_breakpad, has_crashpad, has_native


def run_benchmark(target, backend, cmake, httpserver, gbenchmark, label, runs=1):
    tmp_path = cmake(
        ["sentry_benchmark"],
        {
            "SENTRY_BACKEND": backend,
            "SENTRY_BATCHER_BUFFER_COUNT": "10",
            "SENTRY_BUILD_BENCHMARKS": "ON",
            "CMAKE_BUILD_TYPE": "Release",
        },
    )

    env = dict(os.environ, SENTRY_DSN=make_dsn(httpserver))
    benchmark_out = tmp_path / "benchmark.json"

    for i in range(runs):
        # make sure we are isolated from previous runs
        shutil.rmtree(tmp_path / ".sentry-native", ignore_errors=True)

        run(
            tmp_path,
            "sentry_benchmark",
            [f"--benchmark_filter={target}", f"--benchmark_out={benchmark_out}"],
            env=env,
        )

        # ignore warmup run for init/startup benchmarks
        if runs == 1 or i > 0:
            gbenchmark(benchmark_out, label)

