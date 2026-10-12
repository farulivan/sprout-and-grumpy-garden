import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: './', // relative asset paths, so the build runs from any folder on any static host
  build: {
    rolldownOptions: {
      output: {
        // The engine is 93% of the script and only changes when Phaser is upgraded. Given a file of its
        // own (named after its contents), it stays in a returning player's browser cache across game
        // updates, and only the game's own code is fetched again.
        codeSplitting: { groups: [{ name: 'phaser', test: /[\\/]node_modules[\\/]phaser[\\/]/ }] },
      },
    },
    // Phaser alone is about 1,375 kB minified, far past Vite's default warning. Set a little above
    // that, the warning still speaks up if the engine grows much or the game's own code swells.
    chunkSizeWarningLimit: 1500,
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
