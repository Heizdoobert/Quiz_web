# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/tools/compare.py
lines:544 exports:
---
#!/usr/bin/env python3

# type: ignore

"""
compare.py - versatile benchmark output compare tool
"""

import argparse
import json
import os
import sys
import unittest
from argparse import ArgumentParser

import gbench
from gbench import report, util


def check_inputs(in1, in2, flags):
    """
    Perform checking on the user provided inputs and diagnose any abnormalities
    """
    in1_kind, in1_err = util.classify_input_file(in1)
    in2_kind, in2_err = util.classify_input_file(in2)
    output_file = util.find_benchmark_flag("--benchmark_out=", flags)
    output_type = util.find_benchmark_flag("--benchmark_out_format=", flags)
    if (
        in1_kind == util.IT_Executable
        and in2_kind == util.IT_Executable
        and output_file
    ):
        print(
            (
                "WARNING: '--benchmark_out=%s' will be passed to both "
                "benchmarks causing it to be overwritten"
            )
            % output_file
        )
    if in1_kind == util.IT_JSON and in2_kind == util.IT_JSON:
