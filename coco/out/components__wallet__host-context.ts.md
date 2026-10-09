# components/wallet/host-context.ts
lines:7 exports:WalletHostContext
---
'use client';

import { createContext } from 'react';

// True below WalletProviders. Lets shared UI (the header) know whether the wallet
// stack is mounted without importing wagmi/RainbowKit itself.
export const WalletHostContext = createContext(false);
