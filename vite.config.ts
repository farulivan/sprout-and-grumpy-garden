import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './', // relative asset paths, so the build runs from any folder on any static host
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
