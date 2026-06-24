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

import { importCharsJSON } from '../src/modules/import/json-io.js';
import { state, rebuildCharsMap } from '../src/modules/state.js';

// ── Helpers ────────────────────────────────────────────────────
function makeValidChar(overrides = {}) {
  return { id: 99, name: 'TestChar', pvMax: 30, pvActuel: 30, etat: 'Normal', present: true, ...overrides };
}

function fakeFileInput(json) {
  // Simulate FileReader by triggering onload manually after setting up
  const input = {
    files: [{
      name: 'test.json',
      _content: JSON.stringify(json),
    }],
    value: '',
  };
  return input;
}

// Patch FileReader for Node environment
class MockFileReader {
  readAsText(file) {
    // Async to match real FileReader behavior
    setTimeout(() => {
      this.onload?.({ target: { result: file._content } });
    }, 0);
  }
}

beforeEach(() => {
  state.chars = [];
  rebuildCharsMap.mockClear();
  vi.stubGlobal('FileReader', MockFileReader);
  vi.stubGlobal('window', {
    toast: vi.fn(),
    render: vi.fn(),
    renderRoster: vi.fn(),
  });
});

describe('importCharsJSON — validation', () => {
  it('accepte un char valide (objet unique)', async () => {
    const char = makeValidChar({ id: 1 });
    const input = fakeFileInput(char);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars).toHaveLength(1);
    expect(state.chars[0].name).toBe('TestChar');
  });

  it('accepte un tableau de chars', async () => {
    const chars = [makeValidChar({ id: 1, name: 'A' }), makeValidChar({ id: 2, name: 'B' })];
    const input = fakeFileInput(chars);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars).toHaveLength(2);
  });

  it('rejette les chars sans champs requis', async () => {
    const invalid = [{ id: 1, name: 'X' }]; // manque pvMax et pvActuel
    const input = fakeFileInput(invalid);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars).toHaveLength(0);
    expect(window.toast).toHaveBeenCalledWith(expect.stringContaining('échoué'), 't-w');
  });
});

describe('importCharsJSON — XSS sanitize', () => {
  it('supprime les balises HTML des champs string', async () => {
    const char = makeValidChar({ name: '<script>alert(1)</script>Goblin' });
    const input = fakeFileInput(char);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars[0].name).not.toContain('<script>');
    expect(state.chars[0].name).toContain('Goblin');
  });
});

describe('importCharsJSON — gestion des IDs', () => {
  it('réassigne un nouvel ID si collision', async () => {
    state.chars = [makeValidChar({ id: 99 })];
    const char = makeValidChar({ id: 99, name: 'Duplicate' });
    const input = fakeFileInput(char);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars).toHaveLength(2);
    const imported = state.chars.find(c => c.name === 'Duplicate');
    expect(imported.id).not.toBe(99);
    expect(imported.id).toBe(100); // max(99)+1
  });
});

describe('importCharsJSON — groupe par défaut', () => {
  it('assigne groupe=PJ si absent', async () => {
    const char = makeValidChar({ id: 5 });
    delete char.groupe;
    const input = fakeFileInput(char);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars[0].groupe).toBe('PJ');
  });

  it('conserve le groupe existant', async () => {
    const char = makeValidChar({ id: 6, groupe: 'Ennemi' });
    const input = fakeFileInput(char);
    importCharsJSON(input);
    await new Promise(r => setTimeout(r, 10));
    expect(state.chars[0].groupe).toBe('Ennemi');
  });
});
