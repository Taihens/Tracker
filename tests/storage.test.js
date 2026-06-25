// ═══════════════════════════════════════════════════════════════
//  TESTS — src/modules/storage.js (Lot 02d)
//  Couvre : loadState (storage.js:8), loadSettings (storage.js:37),
//  saveSettings (storage.js:40), applyTheme (storage.js:46),
//  getCharPwds/setCharPwds (storage.js:54-55),
//  getPmAttrPref/setPmAttrPref (storage.js:58-62).
//  Env : Vitest + happy-dom. localStorage : réel happy-dom, clearé entre tests.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/modules/constants.js', () => ({
  DEFAULT_CHARS: [{
    id: 1, name: 'Hero', pvMax: 10, pvActuel: 10, etat: 'Normal',
    voies: [{ name: 'Voie du Guerrier', rang: 1 }],
    armes: [{ name: 'Épée courte' }],
    raciales: [{ name: 'Vision nocturne' }],
    resume: [{ text: 'Résumé' }],
    attrs: { FOR: '+2', DEX: '+1', CON: '+1', INT: '+0', SAG: '+0', CHA: '+0' },
  }],
  ETATS_DEFAULT: [{ name: 'Normal', color: '#888', builtin: true }],
}));

import {
  settings, loadState, loadSettings, saveSettings, applyTheme,
  getCharPwds, setCharPwds, getPmAttrPref, setPmAttrPref,
} from '../src/modules/storage.js';
import { DEFAULT_CHARS, ETATS_DEFAULT } from '../src/modules/constants.js';

const WINDOW_STUBS = ['render', 'renderThemeGrid'];

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  Object.assign(settings, { theme: 'parchment', showPM: true, showPC: true });
  document.body.innerHTML = '';
  WINDOW_STUBS.forEach(g => vi.stubGlobal(g, vi.fn()));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

// ════════════════════════════════════════════════════════════════
describe('loadState — storage.js:8-36', () => {
  it('nominal v4 : charge et mappe les personnages', () => {
    const saved = { chars: [{ id: 1, pvMax: 10, pvActuel: 8, etat: 'Normal' }], log: [], session: 2, combat: 1, round: 3 };
    localStorage.setItem('anathazer_v4', JSON.stringify(saved));
    const result = loadState();
    expect(result.chars).toHaveLength(1);
    expect(result.chars[0].pvActuel).toBe(8);
    expect(result.session).toBe(2);
  });

  it('migration v3 : lit anathazer_v3 si v4 est absent', () => {
    const saved = { chars: [{ id: 1, pvMax: 10, pvActuel: 5, etat: 'Blessé' }], log: [], session: 1, combat: 1, round: 1 };
    localStorage.setItem('anathazer_v3', JSON.stringify(saved));
    const result = loadState();
    expect(result.chars).toHaveLength(1);
    expect(result.chars[0].pvActuel).toBe(5);
  });

  it('JSON corrompu → retourne le fallback DEFAULT_CHARS', () => {
    localStorage.setItem('anathazer_v4', 'NOT_VALID_JSON');
    const result = loadState();
    expect(result.chars).toHaveLength(DEFAULT_CHARS.length);
    expect(result.log).toEqual([]);
    expect(result.session).toBe(1);
  });

  it('s.chars absent → retourne le fallback DEFAULT_CHARS', () => {
    localStorage.setItem('anathazer_v4', JSON.stringify({ log: [], session: 1 }));
    const result = loadState();
    expect(result.chars).toHaveLength(DEFAULT_CHARS.length);
  });

  it('fusionne les voies/armes manquantes depuis DEFAULT_CHARS', () => {
    const saved = { chars: [{ id: 1, pvActuel: 10, voies: [], armes: [] }], log: [], session: 1, combat: 1, round: 1 };
    localStorage.setItem('anathazer_v4', JSON.stringify(saved));
    const result = loadState();
    expect(result.chars[0].voies).toHaveLength(1); // restauré depuis DEFAULT_CHARS
    expect(result.chars[0].armes).toHaveLength(1);
  });

  it('migration att → attContact/attDistance/attMagique', () => {
    const saved = { chars: [{ id: 1, pvActuel: 10, att: '+5' }], log: [], session: 1, combat: 1, round: 1 };
    localStorage.setItem('anathazer_v4', JSON.stringify(saved));
    const result = loadState();
    expect(result.chars[0].attContact).toBe('+5');
    expect(result.chars[0].attDistance).toBe('+5');
    expect(result.chars[0].attMagique).toBe('+5');
  });

  it('s.etats absent → injecté depuis ETATS_DEFAULT', () => {
    const saved = { chars: [], log: [], session: 1, combat: 1, round: 1 };
    localStorage.setItem('anathazer_v4', JSON.stringify(saved));
    const result = loadState();
    expect(result.etats).toBeDefined();
    expect(result.etats[0].name).toBe(ETATS_DEFAULT[0].name);
  });

  it('s.lvlUpHistory absent → initialisé à {}', () => {
    const saved = { chars: [], log: [], session: 1, combat: 1, round: 1 };
    localStorage.setItem('anathazer_v4', JSON.stringify(saved));
    const result = loadState();
    expect(result.lvlUpHistory).toEqual({});
  });
});

// ════════════════════════════════════════════════════════════════
describe('loadSettings — storage.js:37-39', () => {
  it('localStorage vide → garde les defaults', () => {
    loadSettings();
    expect(settings.theme).toBe('parchment');
    expect(settings.showPM).toBe(true);
    expect(settings.showPC).toBe(true);
  });

  it('fusionne les valeurs depuis anathazer_settings', () => {
    localStorage.setItem('anathazer_settings', JSON.stringify({ showPM: false }));
    loadSettings();
    expect(settings.showPM).toBe(false);
    expect(settings.showPC).toBe(true); // inchangé
    expect(settings.theme).toBe('parchment'); // inchangé
  });

  it('JSON corrompu → garde les defaults silencieusement', () => {
    localStorage.setItem('anathazer_settings', 'CORRUPT');
    loadSettings();
    expect(settings.theme).toBe('parchment');
  });
});

// ════════════════════════════════════════════════════════════════
describe('saveSettings — storage.js:40-45', () => {
  it('lit les checkboxes DOM et écrit dans anathazer_settings', () => {
    document.body.insertAdjacentHTML('beforeend',
      `<input id="tog-pm" type="checkbox" checked>` +
      `<input id="tog-pc" type="checkbox">`);
    document.getElementById('tog-pc').checked = false;
    saveSettings();
    const saved = JSON.parse(localStorage.getItem('anathazer_settings'));
    expect(saved.showPM).toBe(true);
    expect(saved.showPC).toBe(false);
    expect(window.render).toHaveBeenCalledOnce();
  });
});

// ════════════════════════════════════════════════════════════════
describe('applyTheme — storage.js:46-51', () => {
  it('met à jour l\'attribut data-theme sur documentElement', () => {
    applyTheme('abyssal');
    expect(document.documentElement.getAttribute('data-theme')).toBe('abyssal');
  });

  it('met à jour settings.theme', () => {
    applyTheme('foret');
    expect(settings.theme).toBe('foret');
  });

  it('écrit dans anathazer_settings', () => {
    applyTheme('sangsfer');
    const saved = JSON.parse(localStorage.getItem('anathazer_settings'));
    expect(saved.theme).toBe('sangsfer');
  });

  it('appelle window.renderThemeGrid()', () => {
    applyTheme('codex');
    expect(window.renderThemeGrid).toHaveBeenCalledOnce();
  });
});

// ════════════════════════════════════════════════════════════════
describe('getCharPwds / setCharPwds — storage.js:54-55', () => {
  it('getCharPwds retourne {} si localStorage vide', () => {
    expect(getCharPwds()).toEqual({});
  });

  it('setCharPwds puis getCharPwds → round-trip', () => {
    setCharPwds({ 1: 'secret', 2: 'mot2passe' });
    expect(getCharPwds()).toEqual({ 1: 'secret', 2: 'mot2passe' });
  });
});

// ════════════════════════════════════════════════════════════════
describe('getPmAttrPref / setPmAttrPref — storage.js:58-62', () => {
  it('getPmAttrPref retourne null si aucune préférence', () => {
    expect(getPmAttrPref(1)).toBeNull();
  });

  it('setPmAttrPref puis getPmAttrPref → round-trip', () => {
    setPmAttrPref(1, 'INT');
    expect(getPmAttrPref(1)).toBe('INT');
  });

  it('isole les préférences par personnage', () => {
    setPmAttrPref(1, 'INT');
    setPmAttrPref(2, 'SAG');
    expect(getPmAttrPref(1)).toBe('INT');
    expect(getPmAttrPref(2)).toBe('SAG');
  });
});
