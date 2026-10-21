# sdk/README.md
lines:541 exports:GET,POST
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
- **Ecosystem SDKs**: Modular packages including `@quizweb/sdk-core` (`shared_modules/`), `@quiz/formatter`, `@quiz/remote-config`, and `@quiz/tracking-analytics`.

---

## Ecosystem Packages

| Package | Repository / Path | Description |
|---|---|---|
| `@heizdoobert/quickquiz-sdk` | [Heizdoobert/SDK-for-web](https://github.com/Heizdoobert/SDK-for-web) | Full API client, server auth, and storage manager |
| `@quizweb/sdk-core` | `shared_modules/` | Shared domain contracts, DTOs, schemas, and validators |
| `@quiz/formatter` | [Heizdoobert/Formatter-SDK](https://github.com/Heizdoobert/Formatter-SDK) | Pure zero-dependency helpers for formatting money, time, number & SEO |
| `@quiz/remote-config` | [Heizdoobert/Remote-config-SDK](https://github.com/Heizdoobert/Remote-config-SDK) | Remote configuration and feature flags via Supabase |
| `@quiz/tracking-analytics` | [Heizdoobert/Tracking-analytics-SDK](https://github.com/Heizdoobert/Tracking-analytics-SDK) | Modular PostHog analytics and Sentry monitoring integrations |

---

## Installation

`@heizdoobert/quickquiz-sdk` is distributed via GitHub Packages.

### 1. Configure `.npmrc`

Add the `@heizdoobert` scope registry to your `.npmrc` file:

