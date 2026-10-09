# Statement of Intent: Flutter Mobile App

**Date:** 2026-10-09

## Intent

- **Outcome:** A new Flutter companion app for iOS and Android with a custom mobile UI, offline-first data handling (syncing to the existing Supabase backend in the background), and native Web3 wallet connections.
- **User:** Mobile users who want to engage with the Web3 quiz platform natively on their phones rather than through a mobile browser.
- **Why now:** The core Next.js web application and Supabase backend are production-ready, making it the perfect time to expand to native mobile platforms.
- **Success:** A baseline Flutter project that runs on iOS/Android, successfully reads/writes to the existing Supabase database (with offline support), and can trigger a WalletConnect prompt to a native wallet app.
- **Constraint:** Web3 wallet connections on native mobile require precise deep-linking setup to work with installed apps (like MetaMask/Trust Wallet), which is technically harder than on the web.
- **Out of scope:** Modifying the existing Next.js web application or creating a separate backend/database.
