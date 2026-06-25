// ═══════════════════════════════════════════════════════════════
//  TESTS — src/modules/ui/render.js (Lot 02c : rendu ciblé)
//  Vérifie l'invariant clé du lot : en Cas B (liste d'IDs inchangée),
//  les inputs de combat ne sont PAS recréés → focus/saisie préservés ;
//  en Cas A (liste d'IDs modifiée), reconstruction complète.
//  Env : Vitest + happy-dom.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/modules/firebase.js', () => ({
  save: vi.fn(), firebaseDB: null, set: vi.fn(), get: vi.fn(), remove: vi.fn(), ref: vi.fn(),
}));
vi.mock('../src/modules/storage.js', () => ({ settings: { showPM: true, showPC: true } }));
vi.mock('../src/modules/levelup.js', () => ({ pendingLvlUps: {} }));
vi.mock('../src/modules/constants.js', () => ({
  DEFAULT_CHARS: [], ETATS_DEFAULT: [{ name: 'Normal' }],
}));

vi.mock('../src/modules/state.js', () => {
  const state = {
    chars: [], log: [], session: 1, combat: 1, round: 1, activeTurn: null,
    etats: [{ name: 'Normal' }, { name: 'Empoisonné' }],
  };
  return {
    state, charHistory: {}, cardTypes: {},
    appMode: 'mj', selectedPlayerChar: null,
    initHistory: vi.fn(),
    setState: vi.fn(), setCharHistory: vi.fn(), pushHistory: vi.fn(),
    getChar: vi.fn((id) => state.chars.find((x) => x.id === id)),
  };
});

import { render, cardHTML } from '../src/modules/ui/render.js';
import { state } from '../src/modules/state.js';

function makeChar(o = {}) {
  return {
    id: 1, name: 'Hero', classe: 'Guerrier', race: 'Humain', niveau: 8,
    pvMax: 100, pvActuel: 100, pmMax: 10, pmActuel: 10, pcMax: 4, pcActuel: 4,
    def: 14, init: 12, att: 10, degats: '1d8', etat: 'Normal',
    present: true, pending: false, ...o,
  };
}

function mountGrid() {
  document.body.innerHTML =
    `<div id="char-grid"></div>` +
    `<span id="h-ses"></span><span id="h-cbt"></span><span id="h-rnd"></span><span id="rnd-disp"></span>`;
  return document.getElementById('char-grid');
}

beforeEach(() => {
  vi.clearAllMocks();
  state.chars = [];
  state.activeTurn = null;
  mountGrid();
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('render — Cas B (liste IDs identique)', () => {
  it('préserve l\'identité de nœud + la valeur des inputs, et met à jour les PV', () => {
    const c = makeChar({ pvActuel: 50 });
    state.chars = [c];
    const grid = document.getElementById('char-grid');
    grid.innerHTML = cardHTML(c); // carte initiale dans le DOM

    const input = document.getElementById('dmg-1');
    input.value = '12';
    input.focus();

    c.pvActuel = 30; // simulate dégâts appliqués
    render();        // present=[1] === dom=[1] → Cas B

    expect(document.getElementById('dmg-1')).toBe(input); // même nœud → non recréé
    expect(document.getElementById('dmg-1').value).toBe('12'); // saisie préservée
    expect(document.querySelector('#card-1 .hp-cur').textContent).toBe('30');
  });

  it('met à jour la classe active-turn et le bouton tour', () => {
    const c = makeChar();
    state.chars = [c];
    document.getElementById('char-grid').innerHTML = cardHTML(c);

    state.activeTurn = 1;
    render();

    expect(document.getElementById('card-1').classList.contains('active-turn')).toBe(true);
    expect(document.querySelector('#card-1 .btn-turn').textContent).toBe('▶ Tour');
  });

  it('met à jour la valeur du sélecteur d\'état + classe bad', () => {
    const c = makeChar();
    state.chars = [c];
    document.getElementById('char-grid').innerHTML = cardHTML(c);

    c.etat = 'Empoisonné';
    render();

    const sel = document.querySelector('#card-1 .stsel');
    expect(sel.value).toBe('Empoisonné');
    expect(sel.classList.contains('bad')).toBe(true);
  });
});

describe('render — Cas A (reconstruction)', () => {
  it('reconstruit la grille quand la liste d\'IDs change', () => {
    state.chars = [makeChar({ id: 1 }), makeChar({ id: 2 })];
    document.getElementById('char-grid').innerHTML = cardHTML(state.chars[0]); // seul card-1
    const input = document.getElementById('dmg-1');

    render(); // present=[1,2] ≠ dom=[1] → Cas A

    expect(document.getElementById('dmg-1')).not.toBe(input); // recréé
    expect(document.getElementById('card-2')).toBeTruthy();
  });

  it('present vide → message empty-state', () => {
    state.chars = [];
    render();
    expect(document.getElementById('char-grid').textContent).toContain('Aucun personnage présent');
  });
});
