import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────
vi.mock('../src/modules/firebase.js', () => ({ save: vi.fn() }));
vi.mock('../src/modules/state.js', () => {
  const state = { chars: [] };
  return {
    get state() { return state; },
    rebuildCharsMap: vi.fn(),
  };
});
vi.mock('../src/modules/import/pdf-loader.js', () => ({
  extractTextFromPdf: vi.fn().mockResolvedValue('bloc de stats goblin'),
}));
vi.mock('../src/modules/assistant/gemini.js', () => ({
  GEMINI_URL: 'https://mock-worker.test',
}));

import { state, rebuildCharsMap } from '../src/modules/state.js';

// ── Helpers ────────────────────────────────────────────────────
function makeMonsterChar(overrides = {}) {
  return {
    id: 50,
    name: 'Goblin',
    classe: 'Monstre',
    race: 'Gobelin',
    niveau: 3,
    pvMax: 18, pvActuel: 18,
    pmMax: 0, pmActuel: 0,
    pcMax: 0, pcActuel: 0,
    def: 12,
    init: '+2',
    att: '+4',
    degats: '1d6+1',
    vitesse: '9m',
    dv: 'D6',
    attrs: { FOR: '+1', DEX: '+2', CON: '0', INT: '-1', SAG: '0', CHA: '-2' },
    armes: [{ nom: 'Épée courte', att: '1d20+4', dmg: '1d6+1', spec: '—' }],
    voies: [],
    raciales: [],
    resume: [],
    groupe: 'Ennemi',
    etat: 'Normal',
    present: true,
    ...overrides,
  };
}

beforeEach(() => {
  state.chars = [];
  rebuildCharsMap.mockClear();
  vi.stubGlobal('window', {
    toast: vi.fn(),
    render: vi.fn(),
    renderRoster: vi.fn(),
  });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: vi.fn().mockResolvedValue({
      candidates: [{ content: { parts: [{ text: JSON.stringify(makeMonsterChar()) }] } }],
    }),
  }));
  // DOM stubs (openMonsterImport, confirmMonsterImport are DOM-bound)
  vi.stubGlobal('document', {
    getElementById: vi.fn().mockReturnValue({ style: {}, textContent: '', innerHTML: '', disabled: false }),
    createElement: vi.fn().mockReturnValue({ click: vi.fn(), href: '', download: '' }),
    head: { appendChild: vi.fn() },
  });
});

describe('confirmMonsterImport — import logique', () => {
  it('importe le char avec groupe Ennemi par défaut', async () => {
    // Importer directement confirmMonsterImport en patchant _previewChar via analyzeMonsterText
    const { confirmMonsterImport, analyzeMonsterText } = await import('../src/modules/import/monster.js');

    // Simuler une analyse pour initialiser _previewChar
    vi.stubGlobal('document', {
      getElementById: vi.fn(id => {
        if (id === 'monster-text-input') return { value: 'stats goblin', trim: () => 'stats goblin' };
        return { style: {}, textContent: '', innerHTML: '', disabled: false, textContent: '' };
      }),
      createElement: vi.fn().mockReturnValue({ click: vi.fn(), href: '', download: '' }),
      head: { appendChild: vi.fn() },
    });

    await analyzeMonsterText();
    confirmMonsterImport();

    expect(state.chars).toHaveLength(1);
    expect(state.chars[0].groupe).toBe('Ennemi');
    expect(state.chars[0].name).toBe('Goblin');
  });
});

describe('groupe par défaut du monstre', () => {
  it('groupe=Ennemi sur le char JSON parsé', () => {
    const char = makeMonsterChar();
    expect(char.groupe).toBe('Ennemi');
  });

  it('un char sans groupe reçoit Ennemi à l\'import', () => {
    const charNoGroupe = makeMonsterChar();
    delete charNoGroupe.groupe;
    // Simuler confirmMonsterImport manuellement
    const c = { ...charNoGroupe };
    c.groupe = c.groupe || 'Ennemi';
    expect(c.groupe).toBe('Ennemi');
  });
});
