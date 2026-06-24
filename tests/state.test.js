// ═══════════════════════════════════════════════════════════════
//  TESTS — src/modules/state.js (Lot 02d)
//  Couvre : rebuildCharsMap (state.js:19), getChar (state.js:25),
//  setState (state.js:30), initHistory (state.js:51),
//  pushHistory (state.js:56), undoChar (state.js:63), redoChar (state.js:76).
//  Env : Vitest + happy-dom.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/modules/firebase.js', () => ({ save: vi.fn() }));

import {
  state, charHistory,
  rebuildCharsMap, getChar, setState, setCharHistory,
  initHistory, pushHistory, undoChar, redoChar,
} from '../src/modules/state.js';
import { save } from '../src/modules/firebase.js';

const WINDOW_STUBS = ['render', 'toast', 'renderLog', 'renderRecap'];

function makeChar(o = {}) {
  return { id: 1, name: 'Hero', pvMax: 100, pvActuel: 100, etat: 'Normal', ...o };
}

function mountTabs({ logActive = false, recapActive = false } = {}) {
  document.body.insertAdjacentHTML('beforeend',
    `<div id="tab-log"${logActive ? ' class="active"' : ''}></div>` +
    `<div id="tab-recap"${recapActive ? ' class="active"' : ''}></div>`);
}

beforeEach(() => {
  vi.clearAllMocks();
  setState({ chars: [], log: [] });
  setCharHistory({});
  document.body.innerHTML = '';
  WINDOW_STUBS.forEach(g => vi.stubGlobal(g, vi.fn()));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

// ════════════════════════════════════════════════════════════════
describe('rebuildCharsMap / getChar — state.js:19-27', () => {
  it('getChar retourne le bon perso après setState', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    expect(getChar(1)).toBe(c);
  });

  it('getChar retourne undefined si id inconnu', () => {
    setState({ chars: [makeChar({ id: 1 })], log: [] });
    expect(getChar(999)).toBeUndefined();
  });

  it('fallback linéaire : getChar trouve un perso ajouté sans rebuild', () => {
    const c1 = makeChar({ id: 1 });
    setState({ chars: [c1], log: [] });
    const c2 = makeChar({ id: 2, name: 'Rogue' });
    state.chars.push(c2); // mutation directe sans rebuildCharsMap
    expect(getChar(2)).toBe(c2); // fallback find() le retrouve
  });
});

// ════════════════════════════════════════════════════════════════
describe('setState — state.js:30-37', () => {
  it('peuple la Map (getChar O(1) fonctionne)', () => {
    const c = makeChar({ id: 5, name: 'Mage' });
    setState({ chars: [c], log: [] });
    expect(getChar(5)).toBe(c);
  });

  it('guard log : initialise state.log à [] si la clé est absente', () => {
    setState({ chars: [] }); // pas de clé `log`
    expect(Array.isArray(state.log)).toBe(true);
    expect(state.log).toHaveLength(0);
  });

  it('guard log : remplace un log non-tableau (objet Firebase) par []', () => {
    setState({ chars: [], log: { 0: 'entrée' } }); // objet, pas tableau
    expect(Array.isArray(state.log)).toBe(true);
    expect(state.log).toHaveLength(0);
  });
});

// ════════════════════════════════════════════════════════════════
describe('initHistory — state.js:51-55', () => {
  it('crée une entrée par perso avec pos=0 et snapshot initial', () => {
    const c = makeChar({ id: 1, pvActuel: 80, etat: 'Normal' });
    setState({ chars: [c], log: [] });
    initHistory();
    expect(charHistory[1]).toBeDefined();
    expect(charHistory[1].pos).toBe(0);
    expect(charHistory[1].snapshots).toHaveLength(1);
    expect(charHistory[1].snapshots[0].pvActuel).toBe(80);
  });

  it('idempotent : relancer ne réinitialise pas un historique existant', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 50, 'Blessé', { logId: 'x', round: 1 });
    initHistory(); // 2ème appel
    expect(charHistory[1].snapshots).toHaveLength(2); // non écrasé
  });
});

// ════════════════════════════════════════════════════════════════
describe('pushHistory — state.js:56-62', () => {
  it('ajoute un snapshot et incrémente pos', () => {
    setState({ chars: [makeChar({ id: 1 })], log: [] });
    initHistory();
    pushHistory(1, 70, 'Affaibli', { logId: 'a', round: 1 });
    expect(charHistory[1].pos).toBe(1);
    expect(charHistory[1].snapshots).toHaveLength(2);
    expect(charHistory[1].snapshots[1].pvActuel).toBe(70);
    expect(charHistory[1].snapshots[1].etat).toBe('Affaibli');
  });

  it('tronque les branches futures après un undo', () => {
    const c = makeChar({ id: 1, pvActuel: 100 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 80, 'Normal', { logId: 'a', round: 1 });
    pushHistory(1, 60, 'Normal', { logId: 'b', round: 2 });
    mountTabs();
    undoChar(1); // pos → 1
    pushHistory(1, 50, 'KO', { logId: 'c', round: 3 }); // tronque snap[2], push → length=3
    expect(charHistory[1].snapshots).toHaveLength(3);
    expect(charHistory[1].pos).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════
describe('undoChar — state.js:63-74', () => {
  it('no-op si pos === 0', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    mountTabs();
    undoChar(1); // pos=0 → rien
    expect(save).not.toHaveBeenCalled();
    expect(window.render).not.toHaveBeenCalled();
  });

  it('no-op si le perso est introuvable dans state', () => {
    setState({ chars: [], log: [] });
    setCharHistory({
      99: { pos: 1, snapshots: [
        { pvActuel: 10, etat: 'Normal', logId: null, logEntry: null },
        { pvActuel: 5,  etat: 'KO',     logId: null, logEntry: null },
      ]},
    });
    mountTabs();
    undoChar(99); // pas dans state.chars
    expect(save).not.toHaveBeenCalled();
  });

  it('décrémente pos et applique le snapshot précédent', () => {
    const c = makeChar({ id: 1, pvActuel: 100, etat: 'Normal' });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Affaibli', { logId: 'a', round: 1 });
    mountTabs();
    undoChar(1);
    expect(charHistory[1].pos).toBe(0);
    expect(c.pvActuel).toBe(100);
    expect(c.etat).toBe('Normal');
  });

  it('retire l\'entrée de log correspondant au logId', () => {
    const c = makeChar({ id: 1, pvActuel: 100 });
    setState({ chars: [c], log: [{ logId: 'entry-1', text: 'Dégâts' }] });
    initHistory();
    pushHistory(1, 70, 'Normal', { logId: 'entry-1', round: 1 });
    mountTabs();
    undoChar(1);
    expect(state.log.find(l => l.logId === 'entry-1')).toBeUndefined();
  });

  it('appelle save(), render(), toast()', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Normal', { logId: 'a', round: 1 });
    mountTabs();
    undoChar(1);
    expect(save).toHaveBeenCalledOnce();
    expect(window.render).toHaveBeenCalledOnce();
    expect(window.toast).toHaveBeenCalledOnce();
  });

  it('appelle renderLog() si #tab-log est actif', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Normal', { logId: 'a', round: 1 });
    mountTabs({ logActive: true });
    undoChar(1);
    expect(window.renderLog).toHaveBeenCalledOnce();
  });

  it('n\'appelle PAS renderLog() si #tab-log est inactif', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Normal', { logId: 'a', round: 1 });
    mountTabs({ logActive: false });
    undoChar(1);
    expect(window.renderLog).not.toHaveBeenCalled();
  });
});

// ════════════════════════════════════════════════════════════════
describe('redoChar — state.js:76-87', () => {
  it('no-op si déjà au bout de l\'historique', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    mountTabs();
    redoChar(1); // pos=0, length-1=0 → no-op
    expect(save).not.toHaveBeenCalled();
  });

  it('incrémente pos et applique le snapshot suivant', () => {
    const c = makeChar({ id: 1, pvActuel: 100, etat: 'Normal' });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Affaibli', { logId: 'a', round: 1 });
    mountTabs();
    undoChar(1); // pos → 0
    vi.clearAllMocks();
    redoChar(1); // pos → 1
    expect(charHistory[1].pos).toBe(1);
    expect(c.pvActuel).toBe(70);
    expect(c.etat).toBe('Affaibli');
  });

  it('re-pousse l\'entrée de log si logEntry non null', () => {
    const logEntry = { logId: 'entry-1', text: 'Dégâts' };
    const c = makeChar({ id: 1, pvActuel: 100 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Normal', logEntry);
    mountTabs();
    undoChar(1); // state.log filtrée (était vide → reste vide)
    redoChar(1); // re-pousse logEntry
    expect(state.log.find(l => l.logId === 'entry-1')).toBeDefined();
  });

  it('appelle save(), render(), toast()', () => {
    const c = makeChar({ id: 1 });
    setState({ chars: [c], log: [] });
    initHistory();
    pushHistory(1, 70, 'Normal', { logId: 'a', round: 1 });
    mountTabs();
    undoChar(1);
    vi.clearAllMocks();
    redoChar(1);
    expect(save).toHaveBeenCalledOnce();
    expect(window.render).toHaveBeenCalledOnce();
    expect(window.toast).toHaveBeenCalledOnce();
  });
});
