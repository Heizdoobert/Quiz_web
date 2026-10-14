# sdk/README.md
lines:528 exports:GET,POST
---
# @heizdoobert/quickquiz-sdk

Official TypeScript SDK for [Quick Quiz](https://quickquiz.app) — an interactive trivia platform featuring AI-generated and community-verified questions, real-time leaderboards, streaks, groups, and discussions.

[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Features

- **Full API Coverage**: Authentication, questions, quiz gameplay, global & group leaderboards, study groups, community ratings/discussions, user profiles, and discovery search.
- **Universal JavaScript / TypeScript**: Dual ESM and CommonJS support with strict TypeScript type definitions (`.d.ts`).
- **Zero Runtime Dependencies**: Built entirely around modern standard web fetch.
- **Server Middleware Included**: First-class Next.js route wrapper and Express middleware under `@heizdoobert/quickquiz-sdk/server` with in-memory token verification caching.
- **Robust Error Handling**: Structured `QuickQuizError` classes with standard API error codes and HTTP statuses.

---

## Installation

`@heizdoobert/quickquiz-sdk` is distributed via GitHub Packages.

### 1. Configure `.npmrc`

Add the `@heizdoobert` scope registry to your `.npmrc` file:

```ini
@heizdoobert:registry=https://npm.pkg.github.com
```

### 2. Install Package

```bash
# npm
npm install @heizdoobert/quickquiz-sdk

# pnpm
pnpm add @heizdoobert/quickquiz-sdk

