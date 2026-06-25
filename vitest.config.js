import { defineConfig, configDefaults } from 'vitest/config';

export default defineConfig({
  test: {
    // Environnement DOM requis pour tester le code couplé (combat.js, etc.)
    environment: 'happy-dom',
    // Les snapshots de handoff/ contiennent des copies de *.test.js (chemins de
    // mock relatifs cassés hors arborescence) → ne pas les collecter.
    exclude: [...configDefaults.exclude, 'handoff/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
});
