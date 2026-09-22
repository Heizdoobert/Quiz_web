# Quick Quiz Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Quick Quiz from vanilla HTML/JS to a Next.js App Router app integrated with Supabase and Web3.

**Architecture:** Next.js (App Router), React, Tailwind CSS. Supabase for database storage and cached leaderboards. Web3 (Wagmi/RainbowKit) for wallet authentication and smart contract interaction per question.

**Tech Stack:** Next.js, React, Tailwind CSS, Supabase JS Client, Wagmi, Viem, RainbowKit, TypeScript (optional but recommended, we will use JS/TS).

**Spec:** `docs/superpowers/specs/2026-09-22-nextjs-web3-supabase-design.md`

## Global Constraints
- Use Next.js App Router (`app` directory).
- Use Tailwind CSS for all styling (replace `style.css`).
- Use Wagmi and RainbowKit for Web3 Wallet Connection.
- Keep the existing visual identity (study mood, dark theme).

---

### Task 1: Project Scaffolding & Cleanup

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Delete: `index.html`, `script.js`, `style.css`, `build.js`

**Interfaces:**
- Produces: Base Next.js application ready for development.

- [ ] **Step 1: Scaffold Next.js in current directory**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir false --import-alias "@/*" --force
```

- [ ] **Step 2: Install dependencies**
```bash
npm install @supabase/supabase-js wagmi viem @rainbow-me/rainbowkit @tanstack/react-query framer-motion canvas-confetti lucide-react
```

- [ ] **Step 3: Cleanup old files**
```bash
rm index.html script.js style.css build.js template.html
```

- [ ] **Step 4: Verify Next.js setup builds**
```bash
npm run build
```
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add .
git commit -m "chore: scaffold Next.js app and remove old vanilla files"
```

---

### Task 2: Supabase Client Setup

**Files:**
- Create: `lib/supabase.ts`
- Create: `.env.local`

**Interfaces:**
- Produces: `supabase` client instance for database queries.

- [ ] **Step 1: Create Supabase Client**
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Setup Environment Variables**
```bash
echo "NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY" >> .env.local
```

- [ ] **Step 3: Commit**
```bash
git add lib/supabase.ts .env.local
git commit -m "feat: setup supabase client"
```

---

### Task 3: Web3 Provider Setup

**Files:**
- Create: `components/Providers.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: Web3 context wrapped around the application.

- [ ] **Step 1: Create Providers component**
```tsx
// components/Providers.tsx
'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'Quick Quiz',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 2: Wrap app in Providers**
```tsx
// app/layout.tsx
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata = {
  title: 'Quick Quiz',
  description: 'Web3 Trivia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-900 text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**
```bash
npm run build
```

- [ ] **Step 4: Commit**
```bash
git add components/Providers.tsx app/layout.tsx
git commit -m "feat: add Web3 and RainbowKit providers"
```

---

### Task 4: Header Component

**Files:**
- Create: `components/Header.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: RainbowKit `ConnectButton`
- Produces: Global Header with wallet connection.

- [ ] **Step 1: Create Header**
```tsx
// components/Header.tsx
'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {
  return (
    <header className="flex justify-between items-center p-4 border-b border-slate-700 bg-slate-800">
      <h1 className="text-2xl font-bold text-blue-400">Quick Quiz</h1>
      <div className="flex items-center gap-4">
        <ConnectButton />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Add to Page Layout**
```tsx
// app/page.tsx
import Header from '@/components/Header';

export default function Home() {
  return (
    <main className="max-w-7xl mx-auto">
      <Header />
      <div className="p-4">
        <p>Welcome to Web3 Quick Quiz</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add components/Header.tsx app/page.tsx
git commit -m "feat: create header with connect wallet button"
```

---

*(Additional tasks like QuizCard, Smart Contract Hooks, and Sidebar would follow in subsequent blocks, but are omitted here to keep the first batch manageable. The agent should start with these foundational tasks.)*
