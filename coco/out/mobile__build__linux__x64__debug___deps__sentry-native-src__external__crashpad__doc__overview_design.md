# mobile/build/linux/x64/debug/_deps/sentry-native-src/external/crashpad/doc/overview_design.md
lines:567 exports:
---
<!--
Copyright 2017 The Crashpad Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Crashpad Overview Design

[TOC]

## Objective

Crashpad is a library for capturing, storing and transmitting postmortem crash
reports from a client to an upstream collection server. Crashpad aims to make it
possible for clients to capture process state at the time of crash with the best
possible fidelity and coverage, with the minimum of fuss.

Crashpad also provides a facility for clients to capture dumps of process state
on-demand for diagnostic purposes.

Crashpad additionally provides minimal facilities for clients to adorn their
crashes with application-specific metadata in the form of per-process key/value
pairs. More sophisticated clients are able to adorn crash reports further
through extensibility points that allow the embedder to augment the crash report
with application-specific metadata.

## Background

It’s an unfortunate truth that any large piece of software will contain bugs
that will cause it to occasionally crash. Even in the absence of bugs, software
