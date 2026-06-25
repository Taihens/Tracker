// ═══════════════════════════════════════════════════════════════
//  TESTS — src/modules/dice.js (Lot 02d)
//  Couvre : dieSVG (dice.js:8), initDiceSVG (dice.js:21),
//  selectDie (dice.js:29), rollDice (dice.js:34),
//  updateDiceStats (dice.js:70), keydown listener (dice.js:92).
//  Env : Vitest + happy-dom. Math.random stubbé pour déterminisme.
// ═══════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/modules/constants.js', () => ({
  DICE_TYPES: [4, 6, 8, 10, 12, 20, 100],
  DEFAULT_CHARS: [], ETATS_DEFAULT: [],
}));

import {
  dieSVG, initDiceSVG, selectDie, rollDice, updateDiceStats,
  diceHistory,
} from '../src/modules/dice.js';

function mountRollDom() {
  document.body.insertAdjacentHTML('beforeend', `
    <input id="dice-n" value="1">
    <input id="dice-mod" value="0">
    <div class="roll-result">
      <span id="rr-formula"></span>
      <span id="rr-dice"></span>
      <span id="rr-total" class="rr-total"></span>
      <span id="rr-label"></span>
    </div>
    <div id="dice-history-list"></div>
    <div id="dice-stats"></div>
    <div id="ds-grid"></div>
    <div id="ds-dist"></div>
  `);
}

beforeEach(() => {
  diceHistory.splice(0); // vide le tableau mutable exporté
  selectDie(20);         // remet activeDie=20 (DOM vide → no-op sur les classList)
  document.body.innerHTML = '';
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

// ════════════════════════════════════════════════════════════════
describe('dieSVG — dice.js:8-20', () => {
  it('retourne une string SVG', () => {
    expect(dieSVG(20)).toMatch(/^<svg /);
  });

  it('d4 : contient <polygon et "d4"', () => {
    const s = dieSVG(4);
    expect(s).toContain('<polygon');
    expect(s).toContain('d4');
  });

  it('d6 : contient <rect et "d6"', () => {
    const s = dieSVG(6);
    expect(s).toContain('<rect');
    expect(s).toContain('d6');
  });

  it('d20 : contient plusieurs <line et "d20"', () => {
    const s = dieSVG(20);
    const lineCount = (s.match(/<line /g) || []).length;
    expect(lineCount).toBeGreaterThanOrEqual(4);
    expect(s).toContain('d20');
  });

  it('d100 : contient <circle et "d100"', () => {
    const s = dieSVG(100);
    expect(s).toContain('<circle');
    expect(s).toContain('d100');
  });
});

// ════════════════════════════════════════════════════════════════
describe('initDiceSVG — dice.js:21-28', () => {
  it('injecte le HTML des dés dans #dice-svg-row', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="dice-svg-row"></div>');
    initDiceSVG();
    expect(document.getElementById('dice-svg-row').innerHTML).not.toBe('');
  });

  it('idempotent : ne re-injecte pas si innerHTML déjà peuplé', () => {
    document.body.insertAdjacentHTML('beforeend', '<div id="dice-svg-row">déjà rempli</div>');
    initDiceSVG();
    expect(document.getElementById('dice-svg-row').innerHTML).toBe('déjà rempli');
  });
});

// ════════════════════════════════════════════════════════════════
describe('selectDie — dice.js:29-33', () => {
  function mountDieWrap() {
    document.body.insertAdjacentHTML('beforeend',
      [4, 6, 8, 10, 12, 20, 100].map(d =>
        `<div class="die-wrap${d === 20 ? ' active-die' : ''}" id="die-${d}"></div>`
      ).join(''));
  }

  it('met à jour la classe active-die dans le DOM', () => {
    mountDieWrap();
    selectDie(6);
    expect(document.getElementById('die-6').classList.contains('active-die')).toBe(true);
    expect(document.getElementById('die-20').classList.contains('active-die')).toBe(false);
  });

  it('un seul dé a la classe active-die après sélection', () => {
    mountDieWrap();
    selectDie(12);
    const active = document.querySelectorAll('.die-wrap.active-die');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('die-12');
  });
});

// ════════════════════════════════════════════════════════════════
describe('rollDice — dice.js:34-69', () => {
  it('jet nominal d20 n=1 mod=0 (random=0.5 → roll=11, total=11)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mountRollDom();
    rollDice();
    expect(document.getElementById('rr-total').textContent).toBe('11');
    expect(document.getElementById('rr-formula').textContent).toBe('1d20');
    expect(document.getElementById('rr-total').className).not.toContain('crit');
    expect(document.getElementById('rr-total').className).not.toContain('fumble');
  });

  it('réussite critique d20 : roll=20 → classe crit et label RÉUSSITE', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999999);
    mountRollDom();
    rollDice();
    expect(document.getElementById('rr-total').className).toContain('crit');
    expect(document.getElementById('rr-label').textContent).toContain('RÉUSSITE CRITIQUE');
  });

  it('échec critique d20 : roll=1 → classe fumble et label ÉCHEC', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    mountRollDom();
    rollDice();
    expect(document.getElementById('rr-total').className).toContain('fumble');
    expect(document.getElementById('rr-label').textContent).toContain('ÉCHEC CRITIQUE');
  });

  it('modificateur positif : roll=10 + mod=5 → total=15', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4999); // floor(0.4999*20)+1 = 10
    mountRollDom();
    document.getElementById('dice-mod').value = '5';
    rollDice();
    expect(document.getElementById('rr-total').textContent).toBe('15');
  });

  it('ajoute une entrée dans diceHistory', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mountRollDom();
    expect(diceHistory).toHaveLength(0);
    rollDice();
    expect(diceHistory).toHaveLength(1);
    expect(diceHistory[0].formula).toBe('1d20');
  });

  it('plafonnement à 100 entrées', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    mountRollDom();
    for (let i = 0; i < 100; i++) {
      diceHistory.push({ formula: '1d20', total: i + 1, rolls: [i + 1], n: 1, mod: 0, isCrit: false, isFumble: false, ts: i });
    }
    rollDice(); // 101e → pop → reste 100
    expect(diceHistory).toHaveLength(100);
  });
});

// ════════════════════════════════════════════════════════════════
describe('updateDiceStats — dice.js:70-91', () => {
  function mountStatsDom() {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="dice-stats"></div>
      <div id="ds-grid"></div>
      <div id="ds-dist"></div>
    `);
  }

  it('cache #dice-stats si diceHistory est vide', () => {
    mountStatsDom();
    updateDiceStats();
    expect(document.getElementById('dice-stats').style.display).toBe('none');
  });

  it('calcule et affiche la moyenne, le meilleur, le pire', () => {
    mountStatsDom();
    [10, 15, 20].forEach((total, i) =>
      diceHistory.push({ formula: '1d20', total, rolls: [total], n: 1, mod: 0, isCrit: false, isFumble: false, ts: i })
    );
    updateDiceStats();
    const grid = document.getElementById('ds-grid').innerHTML;
    expect(grid).toContain('15.0');  // moyenne
    expect(grid).toContain('20');    // meilleur
    expect(grid).toContain('10');    // pire
  });

  it('affiche la distribution d20 si >3 singles avec activeDie=20', () => {
    mountStatsDom();
    [3, 8, 13, 18].forEach((roll, i) =>
      diceHistory.push({ formula: '1d20', total: roll, rolls: [roll], n: 1, mod: 0, isCrit: false, isFumble: false, ts: i })
    );
    updateDiceStats(); // activeDie=20 (reset beforeEach), 4 singles → distribution
    expect(document.getElementById('ds-dist').innerHTML).not.toBe('');
  });
});

// ════════════════════════════════════════════════════════════════
describe('keydown Enter — dice.js:92', () => {
  it('déclenche rollDice quand #tab-dice est actif', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    document.body.insertAdjacentHTML('beforeend', '<div id="tab-dice" class="active"></div>');
    mountRollDom();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(document.getElementById('rr-total').textContent).toBe('11');
  });
});
