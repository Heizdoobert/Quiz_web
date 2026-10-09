# Quick Quiz mobile

The Flutter app for Android and iOS. It talks only to the Next.js API under `/api/mobile/v1`; see [SPEC-flutter-mobile.md](../SPEC-flutter-mobile.md) for the API, sessions, the offline answer queue and releases.

## Run

```
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/mobile/v1
```

`10.0.2.2` is the Android emulator's alias for your machine; start the web app with `npm run dev` from the repository root. For a real device, use your machine's LAN address or the deployed API.

Optional defines:

- `GOOGLE_SERVER_CLIENT_ID`: the Web OAuth client id Supabase's Google provider uses. Without it, Google sign-in returns no ID token; username sign-in still works.
- `SENTRY_DSN`: report crashes to Sentry.

## Check

```
flutter analyze
flutter test
```

CI runs both on every push that touches `mobile/` (`.github/workflows/mobile.yml`).

## Release

Push a tag like `mobile-v1.0.0` to build the APK and app bundle and publish them as a GitHub prerelease. Add the `ANDROID_KEYSTORE_*` repository secrets first if the build is going to the Play Store; without them it is debug-signed.
