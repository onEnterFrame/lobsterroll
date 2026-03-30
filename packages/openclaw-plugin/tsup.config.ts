import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'index.ts',
    'setup-entry': 'setup-entry.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['openclaw'],
  outDir: 'dist',
});
