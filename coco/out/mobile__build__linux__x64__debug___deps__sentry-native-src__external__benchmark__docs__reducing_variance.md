# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/benchmark/docs/reducing_variance.md
lines:98 exports:
---
# Reducing Variance

<a name="disabling-cpu-frequency-scaling" />

## Disabling CPU Frequency Scaling

If you see this error:

```
***WARNING*** CPU scaling is enabled, the benchmark real time measurements may be noisy and will incur extra overhead.
```

you might want to disable the CPU frequency scaling while running the
benchmark, as well as consider other ways to stabilize the performance of
your system while benchmarking.

Exactly how to do this depends on the Linux distribution,
desktop environment, and installed programs.  Specific details are a moving
target, so we will not attempt to exhaustively document them here.

One simple option is to use the `cpupower` program to change the
performance governor to "performance".  This tool is maintained along with
the Linux kernel and provided by your distribution.

It must be run as root, like this:

```bash
sudo cpupower frequency-set --governor performance
```

After this you can verify that all CPUs are using the performance governor
by running this command:

```bash
cpupower frequency-info -o proc
```

The benchmarks you subsequently run will have less variance.

<a name="reducing-variance" />
