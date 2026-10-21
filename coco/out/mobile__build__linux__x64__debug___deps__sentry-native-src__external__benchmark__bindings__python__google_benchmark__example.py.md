# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/bindings/python/google_benchmark/example.py
lines:140 exports:
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
"""Example of Python using C++ benchmark framework.

To run this example, you must first install the `google_benchmark` Python
package.

To install using `setup.py`, download and extract the `google_benchmark` source.
In the extracted directory, execute:
  python setup.py install
"""

import random
import time

import google_benchmark as benchmark
from google_benchmark import Counter


@benchmark.register
def empty(state):
    while state:
        pass


@benchmark.register
def sum_million(state):
    while state:
        sum(range(1_000_000))
