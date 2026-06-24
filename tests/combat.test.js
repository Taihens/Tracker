// ═══════════════════════════════════════════════════════════════
//  TESTS DE CARACTÉRISATION — src/modules/combat.js (Lot 02b)
//  Filet de sécurité avant Lot 02c. On fige le comportement ACTUEL
//  (y compris ses bizarreries). Bugs historiques : documentés, PAS corrigés.
//  Env : Vitest + happy-dom. Aucun import de UI (ui.js / ui/).
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks des dépendances ES statiques de combat.js (chemins relatifs à CE fichier) ──
// Lot 02c : firebase.js exporte désormais des helpers statiques (ré-exports du SDK).
vi.mock('../src/modules/firebase.js', () => ({
  save: vi.fn(), firebaseDB: null,
  set: vi.fn(), get: vi.fn(), remove: vi.fn(), ref: vi.fn(),
}));

vi.mock('../src/modules/state.js', () => {
  // Objet mutable réinitialisé PAR MUTATION dans beforeEach (jamais réassigné :
  // combat.js conserve la référence importée).
  const state = { chars: [], log: [], session: 1, combat: 1, round: 1, activeTurn: null };
  return {
    state,
    cardTypes: {},
    setState: vi.fn(),
    setCharHistory: vi.fn(),
    pushHistory: vi.fn(),
    // Lot 02c : indexation O(1). Le mock relit le tableau mutable courant.
    getChar: vi.fn((id) => state.chars.find((x) => x.id === id)),
  };
});

vi.mock('../src/modules/cof-classes.js', () => ({
  // Impls réelles (pures) — déterminisme assuré via le stub Math.random.
  parseMod: (s) => { const n = parseInt(String(s).replace(/[^0-9\-+]/g, '')); return isNaN(n) ? 0 : n; },
  dvMax: (dv) => ({ D4: 4, D6: 6, D8: 8, D10: 10, D12: 12 }[String(dv).toUpperCase()] || 6),
}));

vi.mock('../src/modules/constants.js', () => ({
  DEFAULT_CHARS: [{ id: 1, name: 'Défaut', pvMax: 10, pvActuel: 10, etat: 'Normal', present: true }],
  ETATS_DEFAULT: [{ name: 'Normal', color: '#888' }],
}));

import {
  hpClass, hpColor, setDmgType, setEtat, updateCardPV, applyDmg, applyHeal,
  adjPM, recupPM, adjPC, adjRound, pointRecup, endRound, endCombat, endSession,
  resetAll, reposComplet, confirmReposComplet, setActiveTurn,
} from '../src/modules/combat.js';
import { state, cardTypes, setState, setCharHistory, pushHistory } from '../src/modules/state.js';
import { save } from '../src/modules/firebase.js';
import { DEFAULT_CHARS, ETATS_DEFAULT } from '../src/modules/constants.js';

// ── Fixtures ──
function makeChar(o = {}) {
  return {
    id: 1, name: 'Hero', niveau: 8,
    pvMax: 100, pvActuel: 100, pmMax: 10, pmActuel: 10, pcMax: 4, pcActuel: 4,
    dv: 'D8', attrs: { CON: '+3' }, etat: 'Normal', present: true, ...o,
  };
}
function mountCard(id) {
  document.body.insertAdjacentHTML('beforeend',
    `<div id="card-${id}"><span class="hp-cur"></span><div class="bar-fill"></div></div>`);
  return document.getElementById('card-' + id);
}
function mountDmgInputs(id, { dmg = '', src = '', tabLogActive = false, tabRecapActive = false } = {}) {
  document.body.insertAdjacentHTML('beforeend',
    `<input id="dmg-${id}" value="${dmg}"><input id="src-${id}" value="${src}">` +
    `<input id="g-cname" value="Donjon"><div id="tab-log"></div><div id="tab-recap"></div>`);
  if (tabLogActive) document.getElementById('tab-log').classList.add('active');
  if (tabRecapActive) document.getElementById('tab-recap').classList.add('active');
}
function mountHealInputs(id, { heal = '', hsrc = '' } = {}) {
  document.body.insertAdjacentHTML('beforeend',
    `<input id="heal-${id}" value="${heal}"><input id="hsrc-${id}" value="${hsrc}">` +
    `<input id="g-cname" value="Donjon"><div id="tab-log"></div><div id="tab-recap"></div>`);
}

const WINDOW_STUBS = ['render', 'toast', 'checkDeath', 'renderLog', 'renderRecap', 'saveSnapshot', 'showUndoBar'];

beforeEach(() => {
  vi.clearAllMocks();
  // Reset state PAR MUTATION (même référence que celle importée par combat.js).
  state.chars = [];
  state.log = [];
  state.session = 1;
  state.combat = 1;
  state.round = 1;
  state.activeTurn = null;
  for (const k in cardTypes) delete cardTypes[k];
  document.body.innerHTML = '';
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  WINDOW_STUBS.forEach((g) => vi.stubGlobal(g, vi.fn()));
  // Lot 02c : showActionConfirm renvoie une Promise<boolean>. Par défaut → confirmé.
  vi.stubGlobal('showActionConfirm', vi.fn(() => Promise.resolve(true)));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

// ════════════════════════════════════════════════════════════════
describe('hpClass', () => {
  it("retourne 'dead' si pvActuel <= 0", () => {
    expect(hpClass(makeChar({ pvActuel: 0, pvMax: 100 }))).toBe('dead');
    expect(hpClass(makeChar({ pvActuel: -5, pvMax: 100 }))).toBe('dead');
  });
  it("retourne 'crit' si ratio < 0.25", () => {
    expect(hpClass(makeChar({ pvActuel: 24, pvMax: 100 }))).toBe('crit');
  });
  it("retourne 'low' si ratio < 0.5", () => {
    expect(hpClass(makeChar({ pvActuel: 49, pvMax: 100 }))).toBe('low');
  });
  it("retourne 'ok' si ratio < 1", () => {
    expect(hpClass(makeChar({ pvActuel: 99, pvMax: 100 }))).toBe('ok');
  });
  it("retourne 'full' si ratio >= 1", () => {
    expect(hpClass(makeChar({ pvActuel: 100, pvMax: 100 }))).toBe('full');
  });
  it("borne pvMax === 0 et pvActuel > 0 → ratio 0 → 'crit'", () => {
    expect(hpClass(makeChar({ pvActuel: 5, pvMax: 0 }))).toBe('crit');
  });
});

describe('hpColor', () => {
  it('mappe chaque classe vers sa couleur', () => {
    expect(hpColor(makeChar({ pvActuel: 0, pvMax: 100 }))).toBe('#555');   // dead
    expect(hpColor(makeChar({ pvActuel: 24, pvMax: 100 }))).toBe('#e04444'); // crit
    expect(hpColor(makeChar({ pvActuel: 49, pvMax: 100 }))).toBe('#ff9800'); // low
    expect(hpColor(makeChar({ pvActuel: 99, pvMax: 100 }))).toBe('#8bc34a'); // ok
    expect(hpColor(makeChar({ pvActuel: 100, pvMax: 100 }))).toBe('#4a9a40'); // full
  });
});

describe('setDmgType', () => {
  it('mute cardTypes[id] avec la valeur passée', () => {
    setDmgType(1, 'Magique');
    expect(cardTypes[1]).toBe('Magique');
  });
  it("type Physique → #tp reçoit 't-phys', #tm reste 'btn-type'", () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="tp-1"></button><button id="tm-1"></button>');
    setDmgType(1, 'Physique');
    expect(document.getElementById('tp-1').className).toBe('btn-type t-phys');
    expect(document.getElementById('tm-1').className).toBe('btn-type');
  });
  it("type Magique → #tm reçoit 't-mag', #tp reste 'btn-type'", () => {
    document.body.insertAdjacentHTML('beforeend', '<button id="tp-1"></button><button id="tm-1"></button>');
    setDmgType(1, 'Magique');
    expect(document.getElementById('tp-1').className).toBe('btn-type');
    expect(document.getElementById('tm-1').className).toBe('btn-type t-mag');
  });
  it('ne lève pas si #tp / #tm absents (gardes if)', () => {
    expect(() => setDmgType(1, 'Physique')).not.toThrow();
  });
});

describe('setEtat', () => {
  it('id introuvable → early return, pas de save', () => {
    setEtat(99, 'Empoisonné');
    expect(save).not.toHaveBeenCalled();
  });
  it("mute c.etat, appelle save / render / checkDeath", () => {
    const c = makeChar(); state.chars = [c];
    setEtat(1, 'Empoisonné');
    expect(c.etat).toBe('Empoisonné');
    expect(save).toHaveBeenCalled();
    expect(window.render).toHaveBeenCalled();
    expect(window.checkDeath).toHaveBeenCalledWith(c);
  });
  it("toast affiché si val !== 'Normal'", () => {
    state.chars = [makeChar()];
    setEtat(1, 'Empoisonné');
    expect(window.toast).toHaveBeenCalled();
  });
  it("toast NON affiché si val === 'Normal', mais checkDeath toujours appelé", () => {
    const c = makeChar({ etat: 'Empoisonné' }); state.chars = [c];
    setEtat(1, 'Normal');
    expect(window.toast).not.toHaveBeenCalled();
    expect(window.checkDeath).toHaveBeenCalledWith(c); // combat.js:31 inconditionnel
  });
});

describe('updateCardPV', () => {
  it('early return si #card absent (ne lève pas)', () => {
    expect(() => updateCardPV(makeChar())).not.toThrow();
  });
  it('met à jour .hp-cur (texte + classe hpClass)', () => {
    mountCard(1);
    updateCardPV(makeChar({ pvActuel: 49, pvMax: 100 }));
    const hp = document.querySelector('.hp-cur');
    expect(hp.textContent).toBe('49');
    expect(hp.className).toBe('hp-cur low');
  });
  it('met à jour .bar-fill (width % + background hpColor)', () => {
    mountCard(1);
    updateCardPV(makeChar({ pvActuel: 50, pvMax: 100 }));
    const bar = document.querySelector('.bar-fill');
    expect(bar.style.width).toBe('50.0%');
    expect(bar.style.background).toBe('#8bc34a'); // ratio 0.5 → classe 'ok'
  });
  it('width clampée à 0% mini', () => {
    mountCard(1);
    updateCardPV(makeChar({ pvActuel: -10, pvMax: 100 }));
    expect(document.querySelector('.bar-fill').style.width).toBe('0.0%');
  });
  it('ajoute la classe ko si pvActuel <= 0, la retire sinon', () => {
    const card = mountCard(1);
    updateCardPV(makeChar({ pvActuel: 0 }));
    expect(card.classList.contains('ko')).toBe(true);
    updateCardPV(makeChar({ pvActuel: 10 }));
    expect(card.classList.contains('ko')).toBe(false);
  });
});

describe('applyDmg', () => {
  it('id introuvable → early return', () => {
    applyDmg(99);
    expect(save).not.toHaveBeenCalled();
  });
  it("amt <= 0 (input vide) → toast 'Valeur invalide', pas de mutation", () => {
    const c = makeChar(); state.chars = [c];
    mountCard(1); mountDmgInputs(1, { dmg: '0' });
    applyDmg(1);
    expect(c.pvActuel).toBe(100);
    expect(window.toast).toHaveBeenCalledWith('Valeur invalide', 't-w');
    expect(state.log).toHaveLength(0);
    expect(save).not.toHaveBeenCalled(); // early return combat.js:45
  });
  it('nominal : déduit les PV (clamp 0), log + pushHistory + toast t-d', () => {
    const c = makeChar({ pvActuel: 50 }); state.chars = [c];
    mountCard(1); mountDmgInputs(1, { dmg: '20', src: 'Gobelin' });
    applyDmg(1);
    expect(c.pvActuel).toBe(30);
    expect(state.log).toHaveLength(1);
    expect(state.log[0]).toMatchObject({ ev: 'Dégâts', val: 20, source: 'Gobelin', type: 'Physique', pv: 30 });
    expect(pushHistory).toHaveBeenCalledWith(1, 30, 'Normal', state.log[0]);
    expect(window.toast).toHaveBeenCalledWith('Hero — −20 PV [Physique] (50→30)', 't-d'); // combat.js:60
  });
  it('passage à 0 → etat Inconscient + toast + checkDeath', () => {
    const c = makeChar({ pvActuel: 10 }); state.chars = [c];
    mountCard(1); mountDmgInputs(1, { dmg: '999' });
    applyDmg(1);
    expect(c.pvActuel).toBe(0);
    expect(c.etat).toBe('Inconscient');
    expect(window.checkDeath).toHaveBeenCalledWith(c);
    expect(window.toast).toHaveBeenCalledWith(`☠ ${c.name} est Inconscient !`, 't-w');
  });
  it("source vide → '—' ; type défaut Physique si cardTypes absent", () => {
    state.chars = [makeChar({ pvActuel: 50 })];
    mountCard(1); mountDmgInputs(1, { dmg: '5' });
    applyDmg(1);
    expect(state.log[0].source).toBe('—');
    expect(state.log[0].type).toBe('Physique');
  });
  it("type lu depuis cardTypes[id] si présent", () => {
    cardTypes[1] = 'Magique';
    state.chars = [makeChar({ pvActuel: 50 })];
    mountCard(1); mountDmgInputs(1, { dmg: '5' });
    applyDmg(1);
    expect(state.log[0].type).toBe('Magique');
  });
  it('vide les inputs #dmg et #src après application', () => {
    state.chars = [makeChar({ pvActuel: 50 })];
    mountCard(1); mountDmgInputs(1, { dmg: '5', src: 'X' });
    applyDmg(1);
    expect(document.getElementById('dmg-1').value).toBe('');
    expect(document.getElementById('src-1').value).toBe('');
  });
  it('renderLog appelé si #tab-log actif, renderRecap si #tab-recap actif', () => {
    state.chars = [makeChar({ pvActuel: 50 })];
    mountCard(1); mountDmgInputs(1, { dmg: '5', tabLogActive: true, tabRecapActive: true });
    applyDmg(1);
    expect(window.renderLog).toHaveBeenCalled();
    expect(window.renderRecap).toHaveBeenCalled();
  });
  it('Lot 02c — bug 1 corrigé : garde DOM si #dmg absent (early return, pas de crash)', () => {
    const c = makeChar(); state.chars = [c];
    // pas de mountDmgInputs → #dmg-1 absent → garde combat.js → early return propre
    expect(() => applyDmg(1)).not.toThrow();
    expect(c.pvActuel).toBe(100);
    expect(state.log).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
  });
  it('Lot 02c — bug 2 corrigé : logId uniques (crypto.randomUUID)', () => {
    const c = makeChar({ pvActuel: 100 }); state.chars = [c];
    mountCard(1); mountDmgInputs(1, { dmg: '5' });
    applyDmg(1);
    document.getElementById('dmg-1').value = '5'; // applyDmg a vidé l'input
    applyDmg(1);
    expect(state.log).toHaveLength(2);
    expect(state.log[0].logId).not.toBe(state.log[1].logId); // unicité garantie
  });
});

describe('applyHeal', () => {
  it('id introuvable → early return', () => {
    applyHeal(99);
    expect(save).not.toHaveBeenCalled();
  });
  it("amt <= 0 → toast 'Valeur invalide', pas de mutation", () => {
    const c = makeChar({ pvActuel: 50 }); state.chars = [c];
    mountCard(1); mountHealInputs(1, { heal: '0' });
    applyHeal(1);
    expect(c.pvActuel).toBe(50);
    expect(window.toast).toHaveBeenCalledWith('Valeur invalide', 't-w');
    expect(save).not.toHaveBeenCalled(); // early return combat.js:66
  });
  it('nominal : ajoute les PV (clamp pvMax), log + pushHistory + toast t-h', () => {
    const c = makeChar({ pvActuel: 90 }); state.chars = [c];
    mountCard(1); mountHealInputs(1, { heal: '30', hsrc: 'Potion' });
    applyHeal(1);
    expect(c.pvActuel).toBe(100); // clampé à pvMax
    expect(state.log[0]).toMatchObject({ ev: 'Soin', val: 30, source: 'Potion', type: '—' });
    expect(pushHistory).toHaveBeenCalled();
    expect(window.toast).toHaveBeenCalledWith('Hero — +30 PV (90→100)', 't-h'); // combat.js:80 (affiche amt, pas le gain borné)
  });
  it('renderLog/renderRecap appelés selon onglet actif', () => {
    state.chars = [makeChar({ pvActuel: 50 })];
    mountCard(1); mountHealInputs(1, { heal: '5' });
    document.getElementById('tab-log').classList.add('active');
    document.getElementById('tab-recap').classList.add('active');
    applyHeal(1);
    expect(window.renderLog).toHaveBeenCalled();
    expect(window.renderRecap).toHaveBeenCalled();
  });
  it("réveil : Inconscient + pv > 0 → etat repasse 'Normal'", () => {
    const c = makeChar({ pvActuel: 0, etat: 'Inconscient' }); state.chars = [c];
    mountCard(1); mountHealInputs(1, { heal: '10' });
    applyHeal(1);
    expect(c.pvActuel).toBe(10);
    expect(c.etat).toBe('Normal');
  });
  it('vide les inputs #heal et #hsrc', () => {
    state.chars = [makeChar({ pvActuel: 50 })];
    mountCard(1); mountHealInputs(1, { heal: '5', hsrc: 'X' });
    applyHeal(1);
    expect(document.getElementById('heal-1').value).toBe('');
    expect(document.getElementById('hsrc-1').value).toBe('');
  });
});

describe('adjPM', () => {
  it('id introuvable → early return', () => {
    adjPM(99, -1);
    expect(save).not.toHaveBeenCalled();
  });
  it('clamp [0, pmMax] et log "PM dépensé" si d < 0', () => {
    const c = makeChar({ pmActuel: 5 }); state.chars = [c];
    adjPM(1, -2);
    expect(c.pmActuel).toBe(3);
    expect(state.log[0]).toMatchObject({ ev: 'PM dépensé', val: 2 });
  });
  it('log "PM récupéré" si d > 0', () => {
    const c = makeChar({ pmActuel: 5 }); state.chars = [c];
    adjPM(1, 2);
    expect(c.pmActuel).toBe(7);
    expect(state.log[0]).toMatchObject({ ev: 'PM récupéré', val: 2 });
  });
  it('valeur inchangée (déjà au max) → early return, pas de log', () => {
    const c = makeChar({ pmActuel: 10, pmMax: 10 }); state.chars = [c];
    adjPM(1, 5);
    expect(c.pmActuel).toBe(10);
    expect(state.log).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
  });
  it('clamp bas à 0 si d très négatif', () => {
    const c = makeChar({ pmActuel: 3 }); state.chars = [c];
    adjPM(1, -99);
    expect(c.pmActuel).toBe(0);
  });
});

describe('recupPM', () => {
  it('id introuvable → early return', () => {
    recupPM(99);
    expect(save).not.toHaveBeenCalled();
  });
  it('gain <= 0 (déjà au max) → early return', () => {
    const c = makeChar({ pmActuel: 10, pmMax: 10 }); state.chars = [c];
    recupPM(1);
    expect(state.log).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
  });
  it('nominal : pmActuel = pmMax + log avec val = gain', () => {
    const c = makeChar({ pmActuel: 3, pmMax: 10 }); state.chars = [c];
    recupPM(1);
    expect(c.pmActuel).toBe(10);
    expect(state.log[0]).toMatchObject({ ev: 'PM récupéré', val: 7, source: 'Récup. totale' });
  });
});

describe('adjPC', () => {
  it('clamp [0, pcMax] et log "PC dépensé" si d < 0', () => {
    const c = makeChar({ pcActuel: 3 }); state.chars = [c];
    adjPC(1, -1);
    expect(c.pcActuel).toBe(2);
    expect(state.log[0]).toMatchObject({ ev: 'PC dépensé', val: 1 });
  });
  it('log "PC récupéré" si d > 0', () => {
    const c = makeChar({ pcActuel: 2, pcMax: 4 }); state.chars = [c];
    adjPC(1, 1);
    expect(c.pcActuel).toBe(3);
    expect(state.log[0]).toMatchObject({ ev: 'PC récupéré', val: 1 });
  });
  it('valeur inchangée → early return, pas de save', () => {
    const c = makeChar({ pcActuel: 0, pcMax: 4 }); state.chars = [c];
    adjPC(1, -1);
    expect(c.pcActuel).toBe(0);
    expect(state.log).toHaveLength(0);
    expect(save).not.toHaveBeenCalled();
  });
});

describe('adjRound', () => {
  it('incrémente state.round de d', () => {
    state.round = 2;
    adjRound(1);
    expect(state.round).toBe(3);
    expect(save).toHaveBeenCalled();
  });
  it('clampe à 1 minimum', () => {
    state.round = 1;
    adjRound(-5);
    expect(state.round).toBe(1);
  });
});

describe('pointRecup', () => {
  it('soigne uniquement present && pv>0 && pv<pvMax ; gain déterministe', () => {
    // Math.random=0.5, dv D8 → roll = floor(0.5*8)+1 = 5 ; gain = max(1, 5 + CON(3) + niv(8)) = 16
    const blesse = makeChar({ id: 1, pvActuel: 50, pvMax: 100 });
    const full = makeChar({ id: 2, pvActuel: 100, pvMax: 100 });
    const mort = makeChar({ id: 3, pvActuel: 0, pvMax: 100 });
    const absent = makeChar({ id: 4, pvActuel: 50, pvMax: 100, present: false });
    state.chars = [blesse, full, mort, absent];
    mountCard(1); mountCard(2);
    pointRecup();
    expect(blesse.pvActuel).toBe(66); // 50 + 16
    expect(full.pvActuel).toBe(100);
    expect(mort.pvActuel).toBe(0);
    expect(absent.pvActuel).toBe(50);
    expect(state.log).toHaveLength(1);
    expect(state.log[0].source).toContain('D8:5+CON+3+Niv8=16');
    expect(pushHistory).toHaveBeenCalledTimes(1);
  });
  it('clampe à pvMax', () => {
    const c = makeChar({ pvActuel: 99, pvMax: 100 }); state.chars = [c];
    pointRecup();
    expect(c.pvActuel).toBe(100);
  });
  it('Lot 02c — bug 3 corrigé : niveau absent → défaut 1, pas de NaN', () => {
    // Math.random=0.5, dv D8 → roll 5 ; gain = max(1, 5 + CON(3) + niv(1)) = 9 → 50+9 = 59
    const c = makeChar({ pvActuel: 50, niveau: undefined }); state.chars = [c];
    mountCard(1);
    pointRecup();
    expect(Number.isNaN(c.pvActuel)).toBe(false);
    expect(c.pvActuel).toBe(59);
  });
  it('animation healing ajoutée puis retirée après 900ms', () => {
    vi.useFakeTimers();
    const c = makeChar({ pvActuel: 50 }); state.chars = [c];
    const card = mountCard(1);
    pointRecup();
    expect(card.classList.contains('healing')).toBe(true);
    vi.advanceTimersByTime(900);
    expect(card.classList.contains('healing')).toBe(false);
  });
});

describe('endRound', () => {
  it('demande confirmation (showActionConfirm appelé)', async () => {
    await endRound();
    expect(window.showActionConfirm).toHaveBeenCalled();
  });
  it('annulation (Promise→false) → state inchangé', async () => {
    vi.stubGlobal('showActionConfirm', vi.fn(() => Promise.resolve(false)));
    state.round = 3;
    await endRound();
    expect(state.round).toBe(3);
    expect(window.saveSnapshot).not.toHaveBeenCalled();
  });
  it("confirmé : round++, 'Surpris'→'Normal', saveSnapshot + showUndoBar", async () => {
    const surpris = makeChar({ id: 1, etat: 'Surpris' });
    const etourdi = makeChar({ id: 2, etat: 'Étourdi' });
    state.chars = [surpris, etourdi];
    state.round = 3;
    await endRound();
    expect(state.round).toBe(4);
    expect(surpris.etat).toBe('Normal');
    expect(etourdi.etat).toBe('Étourdi'); // endRound n'efface QUE Surpris (asymétrie vs endCombat)
    expect(window.saveSnapshot).toHaveBeenCalled();
    expect(window.showUndoBar).toHaveBeenCalled();
  });
});

describe('endCombat', () => {
  it("confirmé : combat++, round=1, activeTurn=null, 'Étourdi'+'Surpris'→'Normal'", async () => {
    const surpris = makeChar({ id: 1, etat: 'Surpris' });
    const etourdi = makeChar({ id: 2, etat: 'Étourdi' });
    const empoisonne = makeChar({ id: 3, etat: 'Empoisonné' });
    state.chars = [surpris, etourdi, empoisonne];
    state.combat = 2; state.round = 5; state.activeTurn = 1;
    await endCombat();
    expect(state.combat).toBe(3);
    expect(state.round).toBe(1);
    expect(state.activeTurn).toBeNull();
    expect(surpris.etat).toBe('Normal');
    expect(etourdi.etat).toBe('Normal');
    expect(empoisonne.etat).toBe('Empoisonné'); // non concerné
  });
});

describe('endSession', () => {
  it('confirmé : session++, combat=1, round=1, activeTurn=null', async () => {
    state.session = 2; state.combat = 3; state.round = 5; state.activeTurn = 1;
    await endSession();
    expect(state.session).toBe(3);
    expect(state.combat).toBe(1);
    expect(state.round).toBe(1);
    expect(state.activeTurn).toBeNull();
    expect(window.saveSnapshot).toHaveBeenCalled();
  });
  it('ne touche PAS aux états des personnages (asymétrie vs endRound/endCombat)', async () => {
    const c = makeChar({ etat: 'Surpris' }); state.chars = [c];
    await endSession();
    expect(c.etat).toBe('Surpris'); // endSession ne nettoie aucun état
  });
});

describe('resetAll', () => {
  it('confirmé : setState(défauts) + setCharHistory({}), sans muter state directement', async () => {
    const original = state.chars;
    await resetAll();
    expect(setState).toHaveBeenCalledTimes(1);
    const arg = setState.mock.calls[0][0];
    expect(arg.chars).toEqual(DEFAULT_CHARS);
    expect(arg.etats).toEqual(ETATS_DEFAULT);
    expect(arg).toMatchObject({ log: [], session: 1, combat: 1, round: 1, activeTurn: null, lvlUpHistory: {} });
    expect(setCharHistory).toHaveBeenCalledWith({});
    expect(state.chars).toBe(original); // resetAll délègue à setState, ne mute pas state
    expect(window.toast).toHaveBeenCalled();
  });
});

describe('reposComplet', () => {
  it('confirmé : saveSnapshot + confirmReposComplet (chars maxés) + showUndoBar', async () => {
    const c = makeChar({ pvActuel: 10, pmActuel: 0, pcActuel: 0, etat: 'Inconscient' });
    state.chars = [c];
    await reposComplet();
    expect(window.saveSnapshot).toHaveBeenCalled();
    expect(c.pvActuel).toBe(c.pvMax);
    expect(c.pmActuel).toBe(c.pmMax);
    expect(c.pcActuel).toBe(c.pcMax);
    expect(c.etat).toBe('Normal');
    expect(window.showUndoBar).toHaveBeenCalled();
  });
});

describe('confirmReposComplet', () => {
  it('restaure PV/PM/PC au max + etat Normal pour tous + setCharHistory({})', () => {
    const a = makeChar({ id: 1, pvActuel: 1, pmActuel: 1, pcActuel: 1, etat: 'Empoisonné' });
    const b = makeChar({ id: 2, pvActuel: 0, pmActuel: 0, pcActuel: 0, etat: 'Inconscient' });
    state.chars = [a, b];
    confirmReposComplet();
    [a, b].forEach((c) => {
      expect(c.pvActuel).toBe(c.pvMax);
      expect(c.pmActuel).toBe(c.pmMax);
      expect(c.pcActuel).toBe(c.pcMax);
      expect(c.etat).toBe('Normal');
    });
    expect(setCharHistory).toHaveBeenCalledWith({});
    expect(save).toHaveBeenCalled();
    expect(window.toast).toHaveBeenCalled();
  });
  it('animation healing ajoutée puis retirée après 900ms (present uniquement)', () => {
    vi.useFakeTimers();
    const c = makeChar(); state.chars = [c];
    const card = mountCard(1);
    confirmReposComplet();
    expect(card.classList.contains('healing')).toBe(true);
    vi.advanceTimersByTime(900);
    expect(card.classList.contains('healing')).toBe(false);
  });
});

describe('setActiveTurn', () => {
  it('activeTurn null → devient id + toast', () => {
    state.chars = [makeChar()]; state.activeTurn = null;
    setActiveTurn(1);
    expect(state.activeTurn).toBe(1);
    expect(window.toast).toHaveBeenCalled();
  });
  it('toggle : activeTurn === id → devient null, pas de toast', () => {
    state.chars = [makeChar()]; state.activeTurn = 1;
    setActiveTurn(1);
    expect(state.activeTurn).toBeNull();
    expect(window.toast).not.toHaveBeenCalled();
  });
  it('save + render toujours appelés', () => {
    state.chars = [makeChar()];
    setActiveTurn(1);
    expect(save).toHaveBeenCalled();
    expect(window.render).toHaveBeenCalled();
  });
});
