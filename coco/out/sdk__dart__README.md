# sdk/dart/README.md
lines:16 exports:
---
# quickquiz_sdk (Dart)

Dart client for Quick Quiz, the counterpart of `@heizdoobert/quickquiz-sdk`. It talks to `/api/v1/*`, uses only `package:http`, and runs in Flutter or server-side Dart.

```dart
final qq = QuickQuizClient(baseUrl: 'https://quickquiz.app/api', retries: 2);
await qq.auth.signIn('name', 'password');   // stores the Bearer token on the client
final q = await qq.questions.random(category: 'science');
final r = await qq.quiz.submitAnswer(q!.id, 1);
```

Resources: `auth`, `questions`, `quiz`, `leaderboard`, `community`, `groups`, `discovery`, `profile`. Failures throw `QuickQuizError(code, message, status)`.

Not covered: the `/api/mobile/v1/*` routes (`mobile/lib/api/api_client.dart` still uses those) and the TypeScript `server` and `storage` modules.

Change an endpoint in `sdk/src/client/*.ts` and the same change belongs in `lib/src/client.dart`. Check with `dart analyze && dart test`.
