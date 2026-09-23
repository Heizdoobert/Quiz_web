# Gamification, User Profile & Category Taxonomy Design

## Overview
This design specifies the next evolution of Quick Quiz, a gamified Gen Z Crypto Learn-to-Earn Web3 application. It integrates:
1. **Web Audio Synthesizer Engine (`lib/audio.ts`)**: Pure Web Audio API synthesized audio with sound toggle, zero external audio asset dependencies, low latency, and cyberpunk feedback.
2. **Category Taxonomy & Question Filtering**: First-class crypto categories (All, DeFi, NFT & Gaming, Layer 1 & Infra) with color-coded chips and category-filtered question retrieval.
3. **Web3 User Profile Modal (`components/modals/ProfileModal.tsx`)**: Dedicated modal showcasing player stats, tier rank, on-chain NFT trophy showcase, category mastery breakdown, and wallet explorer links.
4. **Leaderboard Pagination & Navigation**: Responsive pagination controls (Previous/Next, page indicators) for global and group leaderboards without layout shift.

---

## 1. Web Audio Synthesizer Engine (`lib/audio.ts`)

### Rationale & Design
- **Zero Assets**: Instead of loading static `.mp3` or `.wav` files that could fail or lag on slow mobile networks, audio is generated natively via browser `AudioContext`, `OscillatorNode`, and `GainNode`.
- **User Preference**: Persistent state in `localStorage` (`quick_quiz_sound_enabled`). Default to `true`.
- **Browser Autoplay Compliance**: Lazy initialization on first user interaction (click/touch). If `AudioContext.state === 'suspended'`, call `audioCtx.resume()`.

### Synthesizer Profiles
1. **`playCorrect()`**: Dual-tone uplifting harmonic chime.
   - Tone 1: 523.25 Hz (C5), Sine wave, duration 0.18s.
   - Tone 2 (offset 0.08s): 659.25 Hz (E5), Sine wave with subtle triangle harmonic, duration 0.25s.
   - Color alignment: Neo Mint (`#00FFCC`).
2. **`playWrong()`**: Low-frequency resonant buzz.
   - Frequency: 180 Hz sweeping down to 100 Hz, Sawtooth wave with soft lowpass filter, duration 0.22s.
   - Color alignment: Pop Coral (`#FF4757`).
3. **`playTick()`**: Snappy digital clock tick.
   - High-pitch short impulse (880 Hz, 0.03s), triggered when `timeLeft <= 5` and `timeLeft > 0`.
4. **`playReward()`**: 4-note victory arpeggio ($TOKEN claim).
   - Frequencies: C5 (523 Hz), E5 (659 Hz), G5 (784 Hz), C6 (1046 Hz) sequentially spaced 0.06s apart with exponential gain decay.
   - Color alignment: Crypto Gold (`#FFD166`).
5. **`playPowerup()`**: Futuristic frequency chirp.
   - Linear ramp from 400 Hz to 1200 Hz over 0.15s, Sine wave.
6. **`playFlip()`**: Soft subtle whoosh impulse.
   - Filtered noise sweep over 0.12s.

### Sound Controller Interface
```typescript
export interface SoundEngine {
  isMuted: () => boolean;
  toggleMute: () => boolean;
  setMuted: (muted: boolean) => void;
  playCorrect: () => void;
  playWrong: () => void;
  playTick: () => void;
  playReward: () => void;
  playPowerup: () => void;
  playFlip: () => void;
}
```

---

## 2. Category Taxonomy & Question Filtering

### Categories Specification
- **`All`**: Default unconstrained mode. Accent: `#00FFCC` (Neo Mint).
- **`DeFi`**: Decentralized finance protocols, liquidity, lending, AMMs. Accent: `#8A2BE2` (Neon Purple).
- **`NFT & Gaming`**: Digital collectibles, GameFi, metaverse, ERC-721/1155. Accent: `#FF007F` (Neon Pink).
- **`Layer 1 & Infra`**: Bitcoin, Ethereum, Solana, L2 rollups, consensus. Accent: `#3071FF` (Trust Blue).

### Category Pill Selector
- Located directly above the `QuizCard` in `QuizLayout.tsx`.
- Horizontal scrolling pill group with active glow ring, icon badges, and smooth scale-in transitions.
- Selecting a category immediately resets answered history for that category filter and fetches a matching question.

### Server Action Updates
- `fetchRandomQuestion(excludeIds?: string[], category?: string)`:
  - If `category && category !== 'All'`, appends `.eq('category', category)`.
  - Fallback gracefully to any question if no category matches.

---

## 3. Web3 User Profile Modal (`ProfileModal.tsx`)

### Architecture
- Extends the standard `Modal.tsx` portal architecture with snappy spring transitions (`ease: [0.16, 1, 0.3, 1]`, duration 220ms).
- Opened via a new "Profile" button in `Header.tsx` (visible when wallet is connected).

### Content Sections
1. **User Header**:
   - Web3 Identity: Shortened address (`0x12...34`), Copy Address button with feedback, external link to BaseScan (`https://sepolia.basescan.org/address/${address}`).
   - Level Badge: Dynamically calculated based on `totalAnswered` and `score` (e.g., *Novice Quizzer*, *Crypto Cadet*, *DeFi Pioneer*, *Web3 Grandmaster*).
2. **Stats Grid (4 Cards)**:
   - Total Points (`#00FFCC`).
   - Accuracy % (`#6C5CE7`).
   - Current Streak (`#FFD166`).
   - Best Streak (`#FF4757`).
3. **On-Chain Trophy Showcase (Badges)**:
   - 4 Badges (`Leaderboard Champion`, `Streak Fire`, `Century Quizzer`, `Perfect Round`).
   - Visual states:
     - **Minted**: Glowing gold border, Crypto Gold badge icon, "On-Chain Verified" badge.
     - **Eligible**: Pulsing Neo Mint border, "Ready to Mint" CTA linking directly to `RewardsModal`.
     - **Locked**: Semi-transparent slate border, lock icon, clear unlocking requirement description.
4. **Category Mastery Breakdown**:
   - Mini progress bars indicating accuracy or activity per category (DeFi, NFT, Layer 1).

---

## 4. Leaderboard Pagination & Navigation

### Requirements
- Display 5-10 records per page.
- Snappy `< Previous` and `Next >` navigation with current page and total pages indicator (`Page 1 of 3`).
- Zero layout shift: Fixed min-height for the list container so changing pages doesn't jump surrounding elements.
- Handles empty and single-page cases cleanly.

---

## 5. UI/UX & Motion Requirements
- Colors strictly comply with the Crypto Quiz Palette:
  - Background: `#0A1128` (Deep Space)
  - Card Surfaces: `#1A1B35` (Cyber Violet)
  - Main/Success CTA: `#00FFCC` (Neo Mint)
  - Transition/Levels: `#6C5CE7` (Electric Indigo)
  - Rewards/Top 1: `#FFD166` (Crypto Gold)
  - Danger/Timer: `#FF4757` (Pop Coral)
  - Category DeFi: `#8A2BE2`
  - Category NFT: `#FF007F`
  - Category L1: `#3071FF`
- All interactive buttons have `:hover`, `:active:scale-95`, and `:focus-visible:ring-2 focus-visible:ring-[#00FFCC]`.
- All modals use snappy cubic-bezier easing (`[0.16, 1, 0.3, 1]`) and clean `<AnimatePresence>` unmounting.
- Zero errors on `npm run lint` and `npm run build`.
