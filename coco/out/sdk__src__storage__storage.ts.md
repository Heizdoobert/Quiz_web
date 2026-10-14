# sdk/src/storage/storage.ts
lines:114 exports:StorageManagerOptions,StorageManager
---
import { idbKey } from './key-store';

type WebStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export interface StorageManagerOptions {
  /** Prefix of every stored key, so the SDK never touches the app's own entries. Default `qq`. */
  namespace?: string;
  /** Default `sessionStorage`. */
  storage?: WebStorage;
  /** Default: a non-extractable key in IndexedDB. */
  key?: () => Promise<CryptoKey>;
}

const FORMAT = 'v1.';
const IV_BYTES = 12;
const utf8 = new TextEncoder();

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
};
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function gzip(bytes: Uint8Array<ArrayBuffer>, mode: 'compress' | 'decompress') {
  const transform = mode === 'compress' ? new CompressionStream('gzip') : new DecompressionStream('gzip');
  const stream = new Response(bytes).body!.pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Keeps JSON values in session storage, gzip-compressed then AES-GCM encrypted. The stored key
 * is bound to the ciphertext, so an entry copied under another name will not decrypt.
 */
export class StorageManager {
  private readonly namespace: string;
  private key?: Promise<CryptoKey>;

  constructor(private readonly options: StorageManagerOptions = {}) {
    this.namespace = options.namespace ?? 'qq';
