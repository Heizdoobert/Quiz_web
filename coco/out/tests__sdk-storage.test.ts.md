# tests/sdk-storage.test.ts
lines:163 exports:
---
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { StorageManager } from '@heizdoobert/quickquiz-sdk/client';
import { idbKey } from '../sdk/src/storage/key-store';

class MemoryStorage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const newKey = () =>
  crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);

function setup() {
  const storage = new MemoryStorage();
  const manager = new StorageManager({ storage, key: newKey });
  return { storage, manager };
}

describe('StorageManager', () => {
  it('round-trips JSON values', async () => {
    const key = await newKey();
    const manager = new StorageManager({ storage: new MemoryStorage(), key: async () => key });
    await manager.set('profile', { name: 'ada', streak: 3, tags: ['a', 'b'] });
    expect(await manager.get('profile')).toEqual({ name: 'ada', streak: 3, tags: ['a', 'b'] });
  });

  it('stores ciphertext, never the plain value', async () => {
    const { storage, manager } = setup();
    await manager.set('profile', { name: 'ada-lovelace' });
    const raw = storage.getItem('qq.profile')!;
    expect(raw.startsWith('v1.')).toBe(true);
    expect(raw).not.toContain('ada-lovelace');
    expect(atob(raw.slice(3))).not.toContain('ada-lovelace');
  });

