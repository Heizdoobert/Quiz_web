# Quick Quiz

A modern web & mobile trivia application where players answer questions, build streaks, and compete on leaderboards.

- **Web:** Next.js 16 (App Router), Tailwind CSS v4, Supabase
- **Mobile:** Flutter (Android & iOS)
- **SDK:** TypeScript SDK (`@heizdoobert/quickquiz-sdk`)

---

## 🚀 Quick Start

### 1. Web App

**Prerequisites:** Node 22, Supabase project.

```bash
# Install dependencies
npm install --legacy-peer-deps

# Setup environment
cp .env.example .env.local

# Run development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

> Database migrations are located in [`supabase/migrations/`](supabase/migrations/). Follow [`docs/migrations.md`](docs/migrations.md) for full setup instructions.

---

### 2. Mobile App (Flutter)

Located in [`mobile/`](mobile/).

```bash
cd mobile

# Install dependencies
flutter pub get

# Run on emulator/device
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000/api/mobile/v1

# Build release APKs (~17–20 MB, split per ABI)
flutter build apk --release --split-per-abi
```
Generated APKs:
- Modern 64-bit phones: `build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`
- 32-bit phones: `build/app/outputs/flutter-apk/app-armeabi-v7a-release.apk`
- Emulators: `build/app/outputs/flutter-apk/app-x86_64-release.apk`

---

## 🛠️ Common Commands

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start web development server |
| `npm test` | Run Vitest unit & integration tests |
| `npm run check:task` | Run type-check, lint, security, architecture, and tests |
| `npm run build` | Build production Next.js app |
| `cd mobile && flutter test` | Run Flutter mobile tests |

---

## 📚 Documentation & Specs

- **Mobile Architecture & Spec:** [`SPEC-flutter-mobile.md`](SPEC-flutter-mobile.md) & [`mobile/README.md`](mobile/README.md)
- **TypeScript SDK:** [`sdk/README.md`](sdk/README.md)
- **Architecture & ADRs:** [`docs/decisions/`](docs/decisions/)
- **Database Migrations:** [`docs/migrations.md`](docs/migrations.md)

---

## 📄 License

MIT
