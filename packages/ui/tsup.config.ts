import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  loader: {
    '.css': 'copy',
  },
  onSuccess: async () => {
    // Ensure styles.css is copied to dist
    const fs = await import('node:fs/promises');
    try {
      await fs.copyFile('src/styles/tokens.css', 'dist/styles.css');
    } catch {
      // ignore if dist not ready yet
    }
  },
});
