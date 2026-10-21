# mobile/build/linux/x64/debug/_deps/sentry-native-src/README.md
lines:410 exports:
---
[![Conan Center](https://shields.io/conan/v/sentry-native)](https://conan.io/center/recipes/sentry-native) [![homebrew](https://img.shields.io/homebrew/v/sentry-native)](https://formulae.brew.sh/formula/sentry-native) [![nixpkgs unstable](https://repology.org/badge/version-for-repo/nix_unstable/sentry-native.svg)](https://github.com/NixOS/nixpkgs/blob/nixos-unstable/pkgs/by-name/se/sentry-native/package.nix) [![vcpkg](https://shields.io/vcpkg/v/sentry-native)](https://vcpkg.link/ports/sentry-native)
<p align="center">
  <a href="https://sentry.io/?utm_source=github&utm_medium=logo" target="_blank">
    <picture>
      <source srcset="https://sentry-brand.storage.googleapis.com/sentry-logo-white.png" media="(prefers-color-scheme: dark)" />
      <source srcset="https://sentry-brand.storage.googleapis.com/sentry-logo-black.png" media="(prefers-color-scheme: light), (prefers-color-scheme: no-preference)" />
      <img src="https://sentry-brand.storage.googleapis.com/sentry-logo-black.png" alt="Sentry" width="280">
    </picture>
  </a>
</p>

# Official Sentry SDK for C/C++ <!-- omit in toc -->
[![GH Workflow](https://img.shields.io/github/actions/workflow/status/getsentry/sentry-native/ci.yml?branch=master)](https://github.com/getsentry/sentry-native/actions)
[![codecov](https://codecov.io/gh/getsentry/sentry-native/branch/master/graph/badge.svg)](https://codecov.io/gh/getsentry/sentry-native)

The _Sentry Native SDK_ is an error and crash reporting client for native
applications, optimized for C and C++. Sentry allows adding tags, breadcrumbs, and arbitrary custom context to enrich error reports. Supports Sentry _20.6.0_
and later.

### Note <!-- omit in toc -->

Using the `sentry-native` SDK in a standalone use case is currently an experimental feature. The SDK’s primary function is to fuel our other SDKs, like [`sentry-java`](https://github.com/getsentry/sentry-java) or [`sentry-unreal`](https://github.com/getsentry/sentry-unreal). Support from our side is best effort and we do what we can to respond to issues in a timely fashion, but please understand if we won’t be able to address your issues or feature suggestions.

## Resources <!-- omit in toc -->

- [SDK Documentation](https://docs.sentry.io/platforms/native/)
- [Discord](https://discord.gg/sentry) server for project discussions
- Follow [@sentry](https://x.com/sentry) on X for updates

## Table of Contents <!-- omit in toc -->

- [Downloads](#downloads)
  - [What is Inside](#what-is-inside)
- [Platform and Feature Support](#platform-and-feature-support)
- [Building and Installation](#building-and-installation)
  - [Compile-Time Options](#compile-time-options)
  - [Build Targets](#build-targets)
- [Runtime Configuration](#runtime-configuration)
- [Known Limitations](#known-limitations)
- [Development](#development)
