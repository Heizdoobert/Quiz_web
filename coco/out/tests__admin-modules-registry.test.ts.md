# tests/admin-modules-registry.test.ts
lines:65 exports:
---
import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generate } from '../scripts/gen-admin-modules.mjs';

const roots: string[] = [];

// Builds an app/admin lookalike: static route folders plus module folders with the given files.
function fixture(staticRoutes: string[], modules: Record<string, string[]>) {
  const root = mkdtempSync(join(tmpdir(), 'admin-modules-'));
  roots.push(root);
  for (const route of staticRoutes) mkdirSync(join(root, route));
  mkdirSync(join(root, '_modules'));
  for (const [id, files] of Object.entries(modules)) {
    mkdirSync(join(root, '_modules', id));
    for (const file of files) writeFileSync(join(root, '_modules', id, file), '');
  }
  return root;
}

const complete = ['manifest.ts', 'page.tsx'];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('gen-admin-modules', () => {
  it('registers every module folder, sorted by id, and skips underscore folders', () => {
    const out = generate(fixture(['config'], { zeta: complete, alpha: complete, _template: complete }));
    expect(out).toContain("import manifest0 from './alpha/manifest';");
    expect(out).toContain("import manifest1 from './zeta/manifest';");
    expect(out).toContain("{ id: 'alpha', manifest: manifest0, load: () => import('./alpha/page') },");
    expect(out.indexOf("id: 'alpha'")).toBeLessThan(out.indexOf("id: 'zeta'"));
    expect(out).not.toContain('_template');
  });

  it('writes an empty registry when there are no modules', () => {
    expect(generate(fixture([], {}))).toContain('ADMIN_MODULES: readonly AdminModule[] = [];');
  });
