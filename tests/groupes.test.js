import { describe, it, expect } from 'vitest';
import { groupChars, applyGroupFilter, GROUPE_ORDER, GROUPE_LABELS } from '../src/modules/ui/groupes.js';

// groupes.js est un module pur (pas de DOM, pas de Firebase) — testable directement.

const makeChar = (id, groupe) => ({ id, name: `Perso${id}`, pvMax: 30, pvActuel: 30, groupe });

describe('groupChars', () => {
  it('groupe correctement par faction', () => {
    const chars = [
      makeChar(1, 'PJ'),
      makeChar(2, 'Ennemi'),
      makeChar(3, 'PNJ_allié'),
      makeChar(4, 'PJ'),
    ];
    const groups = groupChars(chars);
    expect(groups.PJ).toHaveLength(2);
    expect(groups.Ennemi).toHaveLength(1);
    expect(groups.PNJ_allié).toHaveLength(1);
  });

  it('backward compat : char sans groupe → PJ par défaut', () => {
    const chars = [makeChar(1, undefined), makeChar(2, null), makeChar(3, '')];
    // undefined, null, '' are all falsy → fallback 'PJ'
    const groups = groupChars(chars);
    expect(groups.PJ).toHaveLength(3);
    expect(groups.Ennemi).toHaveLength(0);
  });

  it('tableau vide → groupes vides', () => {
    const groups = groupChars([]);
    expect(groups.PJ).toHaveLength(0);
    expect(groups.Ennemi).toHaveLength(0);
    expect(groups.PNJ_allié).toHaveLength(0);
  });

  it('groupe inconnu → conservé dans son bucket (ou PJ si falsy)', () => {
    const chars = [makeChar(1, 'Inconnu')];
    const groups = groupChars(chars);
    // groupe truthy mais inconnu → crée un bucket dynamique
    expect(groups['Inconnu']).toHaveLength(1);
  });
});

describe('applyGroupFilter', () => {
  const chars = [
    makeChar(1, 'PJ'),
    makeChar(2, 'Ennemi'),
    makeChar(3, 'PJ'),
    makeChar(4, 'PNJ_allié'),
  ];

  it('sans filtre actif → retourne tous les chars', () => {
    // _activeFilter est null au départ (module fraîchement importé)
    const result = applyGroupFilter(chars);
    expect(result).toHaveLength(chars.length);
  });
});

describe('GROUPE_ORDER & GROUPE_LABELS', () => {
  it('contient les 3 factions', () => {
    expect(GROUPE_ORDER).toContain('PJ');
    expect(GROUPE_ORDER).toContain('PNJ_allié');
    expect(GROUPE_ORDER).toContain('Ennemi');
    expect(GROUPE_ORDER).toHaveLength(3);
  });

  it('GROUPE_LABELS a une étiquette pour chaque groupe', () => {
    for (const g of GROUPE_ORDER) {
      expect(GROUPE_LABELS[g]).toBeTruthy();
    }
  });
});
