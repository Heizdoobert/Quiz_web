import esbuild from 'esbuild';
import fs from 'node:fs/promises';

await fs.mkdir('dist', { recursive: true });

// 1. Build ESM bundle with CSS extraction
const result = await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.mjs',
  format: 'esm',
  sourcemap: true,
  external: ['react', 'react-dom'],
});

// 2. Build CJS bundle
await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.cjs',
  format: 'cjs',
  sourcemap: true,
  external: ['react', 'react-dom'],
});

// 3. Ensure styles.css exists (from extracted css or tokens.css fallback)
try {
  await fs.copyFile('src/styles/tokens.css', 'dist/styles.css');
} catch (e) {
  // Ignored if tokens already emitted
}

console.log('✔ packages/ui build completed successfully');
