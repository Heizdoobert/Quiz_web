# docs/superpowers/specs/2026-09-23-gamification-profile-category-design.md
lines:123 exports:SoundEngine
---
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
