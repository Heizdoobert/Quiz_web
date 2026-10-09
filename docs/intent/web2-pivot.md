# Intent: Web2 Pivot

- **Outcome:** Rip out all Web3/crypto infrastructure and the entire "coin/reward" economy, converting Quick Quiz into a pure, standard Web2 quiz platform.
- **User:** General users who just want to play quizzes without the friction of wallets or confusing reward economies.
- **Why now:** Realization that blockchain and coin economies add unnecessary onboarding friction, codebase complexity, and overhead to the core quiz experience.
- **Success:** A clean codebase (Next.js backend + Flutter app) with zero Web3 dependencies (no Reown, WalletConnect, `viem`, or `siwe`), standard Email/Password auth, and absolutely no mention of coins, tokens, or rewards in the UI or database.
- **Constraint:** We need to safely excise these deeply integrated systems (auth, db schemas, UI components) without breaking the core quiz gameplay and standard user accounts.
- **Out of scope:** No virtual economy, no points-to-rewards system, no crypto wallets, no SIWE, no blockchain connections.
