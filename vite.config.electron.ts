import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist-electron',
    emptyOutDir: false,
    lib: {
      entry: {
        'main/main': path.resolve(__dirname, 'src/main/main.ts'),
        'preload/preload': path.resolve(__dirname, 'src/preload/preload.ts'),
      },
      formats: ['cjs'],
    },
    rollupOptions: {
      external: [
        'electron',
        'node:fs',
        'node:path',
        'node:crypto',
        'node:url',
        'node:os',
        'fs',
        'path',
        'crypto',
        'url',
        'os',
      ],
      output: {
        entryFileNames: '[name].cjs',
        format: 'cjs',
      },
    },
    target: 'node22',
    minify: false,
  },
});
