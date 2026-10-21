# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/bindings/python/google_benchmark/__init__.py
lines:143 exports:
---
# Copyright 2020 Google Inc. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Python benchmarking utilities.

Example usage:
  import google_benchmark as benchmark

  @benchmark.register
  def my_benchmark(state):
      ...  # Code executed outside `while` loop is not timed.

      while state:
        ...  # Code executed within `while` loop is timed.

  if __name__ == '__main__':
    benchmark.main()
"""

import atexit

from absl import app

from google_benchmark import _benchmark
from google_benchmark._benchmark import (
    Counter as Counter,
    State as State,
    kMicrosecond as kMicrosecond,
    kMillisecond as kMillisecond,
    kNanosecond as kNanosecond,
