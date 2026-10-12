import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const testSetup = fileURLToPath(new URL('./src/test/setup.ts', import.meta.url));

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/photographer.xy.github.io/' : '/',
  plugins: [react()],
  server: { host: '0.0.0.0' },
  test: { environment: 'jsdom', setupFiles: resolve(testSetup), css: true },
}));
