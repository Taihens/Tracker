import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Environnement DOM requis pour tester le code couplé (combat.js, etc.)
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
