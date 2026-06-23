import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Smoke tests purs (aucun DOM). jsdom sera ajouté au Lot 04 si besoin.
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
