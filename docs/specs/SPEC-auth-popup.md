# Spec: auth-popup

**Module ID:** `auth-popup`
**Capability Map:** `auth-popup` → `user-features` → `ecosystem-v2` → `perf-arch`

## Mục tiêu (Objective)

Thay thế hoàn toàn `SignInModal` cũ (292 dòng, 1 file) bằng popup Auth mới với **2 bước rõ ràng**:

1. **Bước 1 — Chọn hành động:** Màn hình chào mừng để người dùng chọn **Đăng nhập** hoặc **Đăng ký** (hoặc đóng popup nếu không muốn)
2. **Bước 2 — Chọn phương thức:** Hiển thị form tương ứng với 3 tab phương thức (Username, Wallet, Email)

### User Stories

- **US-1:** Là người chơi mới, tôi muốn thấy rõ ràng 2 lựa chọn "Đăng nhập" và "Đăng ký" khi popup mở, để tôi không bị nhầm lẫn.
- **US-2:** Là người chơi đã có tài khoản, tôi muốn chọn "Đăng nhập" rồi chọn phương thức (username/wallet/email) quen thuộc.
- **US-3:** Là người chơi mới, tôi muốn chọn "Đăng ký" rồi tạo tài khoản bằng phương thức tôi thích.
- **US-4:** Tôi muốn quay lại bước trước bất cứ lúc nào (nút back).
- **US-5:** Tôi muốn popup animation mượt mà, responsive trên mobile và desktop.

### Thành công khi (Success Criteria)

- [ ] SC-1: Popup mở ra hiển thị màn hình chọn Login/Register (không nhảy thẳng vào form)
- [ ] SC-2: Chọn Login → hiển thị 3 tab (Username, Wallet, Email) ở chế độ đăng nhập
- [ ] SC-3: Chọn Register → hiển thị 3 tab ở chế độ đăng ký (Wallet tab chỉ hiển thị "Connect wallet" vì wallet tự đăng ký)
- [ ] SC-4: Nút Back quay về màn hình chọn từ bất kỳ tab nào
- [ ] SC-5: Animation chuyển bước mượt mà (framer-motion, reuse pattern từ `Modal.tsx`)
- [ ] SC-6: Responsive — hoạt động tốt trên mobile (≥ 320px) và desktop
- [ ] SC-7: Accessible — focus trap, keyboard navigation (Tab/Escape), aria labels, WCAG 2.1 AA
- [ ] SC-8: Tất cả consumer hiện tại (`requireSignIn()`, `useSession()`) hoạt động không đổi
- [ ] SC-9: Zero type errors, zero lint errors
- [ ] SC-10: Coverage dòng thay đổi ≥ 80%, project ratchet ≥ 62.5%
- [ ] SC-11: Bundle size không tăng quá 150 kB gzip/route
- [ ] SC-12: Production build thành công (`npm run build`)

## Tech Stack

| Layer | Công nghệ | Phiên bản |
|-------|-----------|-----------|
| Framework | Next.js (App Router) | 15.x |
| UI | React + Tailwind CSS | 19.x / 4.x |
| Animation | framer-motion | 12.x |
| Icons | lucide-react | ^0.511 |
| Auth backend | Supabase Auth + SIWE (viem) | — |
| Wallet | RainbowKit + wagmi | — |
| Test | Vitest + React Testing Library | — |

## Commands

```bash
# Fast gates (types, lint, secrets)
npm run check:fast

# Tests with coverage
npm run test:coverage

# Architecture check
npm run check:architecture

# Full task verification
npm run check:task

# Production build
npm run build

# Dev server
npm run dev
```

## Cấu trúc dự án (Project Structure)

### Files thay đổi

```
components/auth/
├── AuthPopup.tsx          # MỚI — Component chính thay thế SignInModal
├── AuthChoiceScreen.tsx   # MỚI — Bước 1: màn hình chọn Login/Register
├── AuthMethodTabs.tsx     # MỚI — Bước 2: tabs Username/Wallet/Email
├── SignInModal.tsx        # XÓA — file cũ (292 dòng)
└── __tests__/
    └── AuthPopup.test.tsx # MỚI — Tests

hooks/shared/
└── use-session.tsx        # SỬA — import AuthPopup thay vì SignInModal
```

### Files KHÔNG thay đổi

```
components/Modal.tsx                    # Base modal — giữ nguyên, reuse
lib/actions/auth-actions.ts             # Backend logic — giữ nguyên
lib/auth-adapter.ts                     # SIWE adapter — giữ nguyên
components/layout/Header.tsx            # Consumer — giữ nguyên (dùng useSession)
components/Providers.tsx                # Provider — giữ nguyên
```

### Consumers hiện tại (không cần sửa, dùng qua `useSession`)

- `components/layout/Header.tsx`
- `components/quiz/QuizLayout.tsx`
- `components/quiz/AnswerBack.tsx`
- `components/lists/ContestPlay.tsx`
- `components/lists/ContestBrowser.tsx`
- `components/lists/ListsNav.tsx`
- `components/lists/MyListsDashboard.tsx`
- `components/lists/ReviewQueue.tsx`
- `components/leaderboard/LeaderboardPanel.tsx`
- `components/community/CommentList.tsx`

## Code Style

```tsx
// Ví dụ component style — functional, typed props, Tailwind utility classes
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

type AuthStep = 'choice' | 'method';
type AuthMode = 'login' | 'register';

interface AuthPopupProps {
  isOpen: boolean;
  onClose: () => void;
  refresh: () => Promise<unknown>;
}

export default function AuthPopup({ isOpen, onClose, refresh }: AuthPopupProps) {
  const [step, setStep] = useState<AuthStep>('choice');
  const [mode, setMode] = useState<AuthMode>('login');
  // ...
}
```

**Quy ước:**
- `'use client'` ở đầu file cho client components
- Props interface riêng biệt, không dùng inline object type
- State type rõ ràng (`AuthStep`, `AuthMode`)
- Tailwind classes — dùng design tokens hiện có (`#00FFCC`, `#6C5CE7`, `#0A1128`, `#14163A`, `#25284D`, `#2D305A`)
- framer-motion cho animation — reuse pattern từ `Modal.tsx`

## Testing Strategy

| Level | Gì | Ở đâu |
|-------|-----|-------|
| Unit | Render, tab switching, step navigation, form validation | `components/auth/__tests__/AuthPopup.test.tsx` |
| Integration | `requireSignIn()` mở popup đúng, đóng popup resolve promise | Vitest + RTL |

**Coverage yêu cầu:**
- Dòng thay đổi ≥ 80%
- Project ratchet ≥ 62.5%

**Test cases bắt buộc:**
1. Popup mở → hiển thị màn hình choice (Login/Register buttons)
2. Click Login → chuyển sang bước method với mode=login
3. Click Register → chuyển sang bước method với mode=register
4. Click Back → quay về bước choice
5. Đóng popup → reset về bước choice
6. Keyboard: Escape đóng popup
7. Tab username: submit form gọi đúng `signInWithUsername` hoặc `signUpWithUsername`
8. Tab email: gửi code, verify code
9. Tab wallet: hiển thị ConnectButton

## Boundaries (Ranh giới)

### Luôn làm (Always)
- Reuse `Modal.tsx` làm container — không tạo modal mới
- Giữ nguyên `SessionProvider` pattern (`requireSignIn()` trả `Promise<boolean>`)
- Giữ nguyên `next/dynamic` lazy-load cho AuthPopup
- Test trước khi commit
- Chạy `check:fast` sau mỗi edit

### Hỏi trước (Ask First)
- Thêm dependency mới
- Thay đổi `auth-actions.ts` backend logic
- Thay đổi `SessionProvider` API

### Không bao giờ (Never)
- Commit secrets
- Bỏ qua test thất bại
- Tăng bundle size quá 150 kB/route
- Hạ coverage ratchet

## Thiết kế UI (UI Design)

### Bước 1: Màn hình chọn (Choice Screen)

```
┌─────────────────────────────┐
│  ⚡ Welcome to Quick Quiz   │  ← header (Modal title)
│─────────────────────────────│
│                             │
│     🎮 Ready to play?      │  ← tagline
│                             │
│  ┌─────────────────────┐    │
│  │   🔑 Đăng nhập      │    │  ← nút chính (gradient)
│  │   Sign in to your    │    │
│  │   account            │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │   ✨ Đăng ký         │    │  ← nút phụ (outline)
│  │   Create a new       │    │
│  │   account            │    │
│  └─────────────────────┘    │
│                             │
│  "Play without an account"  │  ← link đóng popup
│                             │
└─────────────────────────────┘
```

### Bước 2: Form phương thức (Method Tabs)

```
┌─────────────────────────────┐
│  ← Back    Sign In / Sign Up│  ← header với nút back
│─────────────────────────────│
│  [Username] [Wallet] [Email]│  ← tabs
│─────────────────────────────│
│                             │
│  (Form tương ứng tab)       │  ← giữ nguyên form logic hiện tại
│                             │
└─────────────────────────────┘
```

## Open Questions

> Không có — tất cả yêu cầu đã rõ ràng từ cuộc trao đổi.

---

*Spec này thuộc module `auth-popup` trong capability map đã được duyệt.*
*Viết ngày: 2026-10-05 bởi Antigravity agent.*
