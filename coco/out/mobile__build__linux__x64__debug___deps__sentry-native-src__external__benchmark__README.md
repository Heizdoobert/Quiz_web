# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/README.md
lines:221 exports:
---
# Benchmark

[![build-and-test](https://github.com/google/benchmark/workflows/build-and-test/badge.svg)](https://github.com/google/benchmark/actions?query=workflow%3Abuild-and-test)
[![bazel](https://github.com/google/benchmark/actions/workflows/bazel.yml/badge.svg)](https://github.com/google/benchmark/actions/workflows/bazel.yml)
[![pylint](https://github.com/google/benchmark/workflows/pylint/badge.svg)](https://github.com/google/benchmark/actions?query=workflow%3Apylint)
[![test-bindings](https://github.com/google/benchmark/workflows/test-bindings/badge.svg)](https://github.com/google/benchmark/actions?query=workflow%3Atest-bindings)
[![Coverage Status](https://coveralls.io/repos/google/benchmark/badge.svg)](https://coveralls.io/r/google/benchmark)

[![Discord](https://discordapp.com/api/guilds/1125694995928719494/widget.png?style=shield)](https://discord.gg/cz7UX7wKC2)

A library to benchmark code snippets, similar to unit tests. Example:

```c++
#include <benchmark/benchmark.h>

static void BM_SomeFunction(benchmark::State& state) {
  // Perform setup here
  for (auto _ : state) {
    // This code gets timed
    SomeFunction();
  }
}
// Register the function as a benchmark
BENCHMARK(BM_SomeFunction);
// Run the benchmark
BENCHMARK_MAIN();
```

## Getting Started

To get started, see [Requirements](#requirements) and
[Installation](#installation). See [Usage](#usage) for a full example and the
[User Guide](docs/user_guide.md) for a more comprehensive feature overview.

It may also help to read the [Google Test documentation](https://github.com/google/googletest/blob/main/docs/primer.md)
as some of the structural aspects of the APIs are similar.

## Resources

[Discussion group](https://groups.google.com/d/forum/benchmark-discuss)
