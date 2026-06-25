import { state, appMode, selectedPlayerChar, charHistory, setCharHistory, rebuildCharsMap } from '../state.js';
import { save } from '../firebase.js';

let _lastActionSnapshot = null;
let _confirmResolve = null; // promesse pendante (Lot 02c)

// Retourne une Promise<boolean> (OK→true, annulation/fermeture→false).
// Compat legacy : si onConfirm est fourni, exécution au clic OK (pas de Promise).
export function showActionConfirm(icon, title, desc, onConfirm) {
  document.getElementById('action-confirm-icon').textContent = icon;
  document.getElementById('action-confirm-title').textContent = title;
  document.getElementById('action-confirm-desc').textContent = desc;
  const overlay = document.getElementById('action-confirm-overlay');
  overlay.style.display = 'flex';
  if (onConfirm) {
    document.getElementById('action-confirm-ok').onclick = () => { closeActionConfirm(); onConfirm(); };
    return;
  }
  return new Promise(resolve => {
    _confirmResolve = resolve;
    document.getElementById('action-confirm-ok').onclick = () => {
      _confirmResolve = null;
      overlay.style.display = 'none';
      resolve(true);
    };
  });
}
export function closeActionConfirm() {
  document.getElementById('action-confirm-overlay').style.display = 'none';
  if (_confirmResolve) { const r = _confirmResolve; _confirmResolve = null; r(false); }
}
export function saveSnapshot() {
  _lastActionSnapshot = JSON.parse(JSON.stringify({
    round: state.round, combat: state.combat, session: state.session,
    activeTurn: state.activeTurn,
    chars: state.chars, log: state.log, etats: state.etats,
    lvlUpHistory: state.lvlUpHistory, charHistory,
  }));
  updateUndoButtonVisibility();
}
export function updateUndoButtonVisibility() {
  const btn = document.getElementById('btn-undo-last');
  if (!btn) return;
  btn.style.display = (_lastActionSnapshot !== null) ? '' : 'none';
}
export function undoLastAction() {
  if (!_lastActionSnapshot) { window.toast('Rien à annuler', 't-w'); return; }
  const s = _lastActionSnapshot;
  state.round = s.round; state.combat = s.combat; state.session = s.session; state.activeTurn = s.activeTurn;
  state.chars = s.chars; state.log = s.log; state.etats = s.etats; state.lvlUpHistory = s.lvlUpHistory;
  setCharHistory(s.charHistory);
  rebuildCharsMap();
  _lastActionSnapshot = null;
  save(); window.render(); updateUndoButtonVisibility(); window.toast('Action annulée', 't-i');
}
export function checkDeath(c) {
  if (appMode !== 'joueur' || c.id !== selectedPlayerChar) return;
  if (c.etat === 'Mort' || c.pvActuel === 0) {
    document.getElementById('death-msg').textContent = `${c.name} est tombé au combat. Tu peux continuer ou choisir un autre personnage.`;
    document.getElementById('death-overlay').classList.add('show');
  }
}
export function closeDeath() { document.getElementById('death-overlay').classList.remove('show'); }
