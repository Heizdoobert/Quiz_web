'use client';

import { useSyncExternalStore } from 'react';
import { soundEngine } from '@/lib/services/audio';

export function useSoundToggle() {
  const isMuted = useSyncExternalStore(
    soundEngine.subscribe,
    () => soundEngine.isMuted(),
    () => false
  );

  const handleToggleSound = () => {
    const nextMuted = soundEngine.toggleMute();
    if (!nextMuted) {
      soundEngine.playTick();
    }
  };

  return { isMuted, handleToggleSound };
}
