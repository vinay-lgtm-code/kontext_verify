import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'node18',
  platform: 'node',
  // Paid-tier modules that may not exist in free-tier builds (gitignored).
  // Mark as external so esbuild leaves the dynamic import() as-is;
  // runtime try-catch in app.ts handles the missing modules gracefully.
  external: ['./treasury-sdn-sync.js', './csl-sync.js'],
});
