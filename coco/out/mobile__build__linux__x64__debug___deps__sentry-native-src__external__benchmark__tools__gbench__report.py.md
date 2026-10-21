# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/tools/gbench/report.py
lines:1635 exports:
---
# type: ignore

"""
report.py - Utilities for reporting statistics about benchmark results
"""

import copy
import os
import random
import re
import unittest

from numpy import array
from scipy.stats import gmean, mannwhitneyu


class BenchmarkColor:
    def __init__(self, name, code):
        self.name = name
        self.code = code

    def __repr__(self):
        return "%s%r" % (self.__class__.__name__, (self.name, self.code))

    def __format__(self, format):
        return self.code


# Benchmark Colors Enumeration
BC_NONE = BenchmarkColor("NONE", "")
BC_MAGENTA = BenchmarkColor("MAGENTA", "\033[95m")
BC_CYAN = BenchmarkColor("CYAN", "\033[96m")
BC_OKBLUE = BenchmarkColor("OKBLUE", "\033[94m")
BC_OKGREEN = BenchmarkColor("OKGREEN", "\033[32m")
BC_HEADER = BenchmarkColor("HEADER", "\033[92m")
BC_WARNING = BenchmarkColor("WARNING", "\033[93m")
BC_WHITE = BenchmarkColor("WHITE", "\033[97m")
BC_FAIL = BenchmarkColor("FAIL", "\033[91m")
BC_ENDC = BenchmarkColor("ENDC", "\033[0m")
BC_BOLD = BenchmarkColor("BOLD", "\033[1m")
