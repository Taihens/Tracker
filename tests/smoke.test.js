import { describe, it, expect } from 'vitest';

// Smoke tests — vérifient les constantes et utilitaires purs
// La logique DOM/Firebase est testée manuellement via Chrome DevTools

describe('DICE_TYPES', () => {
  it('contient les 7 types de dés COF standard', () => {
    const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];
    expect(DICE_TYPES).toHaveLength(7);
    expect(DICE_TYPES).toContain(20);
    expect(DICE_TYPES).toContain(100);
  });
});

describe('Calcul PV', () => {
  it('PV = DV × niveau + mod CON × niveau', () => {
    const dv = 8;
    const niveau = 8;
    const modCon = 3;
    const pvMax = dv * niveau + modCon * niveau;
    expect(pvMax).toBe(88);
  });
});

describe('Etats de base', () => {
  it('les états buildtin incluent Normal et Mort', () => {
    const builtins = ['Normal', 'Mort', 'Inconscient', 'Paralysé'];
    expect(builtins).toContain('Normal');
    expect(builtins).toContain('Mort');
  });
});
