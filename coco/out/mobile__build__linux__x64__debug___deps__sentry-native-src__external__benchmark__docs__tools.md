# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/docs/tools.md
lines:343 exports:
---
# Benchmark Tools

## compare.py

The `compare.py` can be used to compare the result of benchmarks.

### Dependencies
The utility relies on the [scipy](https://www.scipy.org) package which can be installed using pip:
```bash
pip3 install -r requirements.txt
```

### Displaying aggregates only

The switch `-a` / `--display_aggregates_only` can be used to control the
displayment of the normal iterations vs the aggregates. When passed, it will
be passthrough to the benchmark binaries to be run, and will be accounted for
in the tool itself; only the aggregates will be displayed, but not normal runs.
It only affects the display, the separate runs will still be used to calculate
the U test.

### Modes of operation

There are three modes of operation:

1. Just compare two benchmarks
The program is invoked like:

``` bash
$ compare.py benchmarks <benchmark_baseline> <benchmark_contender> [benchmark options]...
```
Where `<benchmark_baseline>` and `<benchmark_contender>` either specify a benchmark executable file, or a JSON output file. The type of the input file is automatically detected. If a benchmark executable is specified then the benchmark is run to obtain the results. Otherwise the results are simply loaded from the output file.

`[benchmark options]` will be passed to the benchmarks invocations. They can be anything that binary accepts, be it either normal `--benchmark_*` parameters, or some custom parameters your binary takes.

Example output:
```
$ ./compare.py benchmarks ./a.out ./a.out
RUNNING: ./a.out --benchmark_out=/tmp/tmprBT5nW
Run on (8 X 4000 MHz CPU s)
