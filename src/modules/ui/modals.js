import { state, appMode, selectedPlayerChar } from '../state.js';
import { save } from '../firebase.js';

let _lastActionSnapshot = null, _undoTimer = null;
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
    chars: state.chars.map(c => ({ id: c.id, etat: c.etat, pvActuel: c.pvActuel, pmActuel: c.pmActuel, pcActuel: c.pcActuel }))
  }));
}
export function showUndoBar(msg) {
  const bar = document.getElementById('undo-bar');
  document.getElementById('undo-bar-msg').textContent = msg;
  bar.style.display = 'flex';
  if (_undoTimer) clearTimeout(_undoTimer);
  _undoTimer = setTimeout(hideUndoBar, 12000);
}
export function hideUndoBar() {
  document.getElementById('undo-bar').style.display = 'none';
  if (_undoTimer) { clearTimeout(_undoTimer); _undoTimer = null; }
  _lastActionSnapshot = null;
}
export function undoLastAction() {
  if (!_lastActionSnapshot) { window.toast('Rien à annuler', 't-w'); return; }
  const s = _lastActionSnapshot;
  state.round = s.round; state.combat = s.combat; state.session = s.session; state.activeTurn = s.activeTurn;
  s.chars.forEach(sc => {
    const c = state.chars.find(x => x.id === sc.id);
    if (c) { c.etat = sc.etat; c.pvActuel = sc.pvActuel; c.pmActuel = sc.pmActuel; c.pcActuel = sc.pcActuel; }
  });
  save(); window.render(); hideUndoBar(); window.toast('Action annulée', 't-i');
}
export function checkDeath(c) {
  if (appMode !== 'joueur' || c.id !== selectedPlayerChar) return;
  if (c.etat === 'Mort' || c.pvActuel === 0) {
    document.getElementById('death-msg').textContent = `${c.name} est tombé au combat. Tu peux continuer ou choisir un autre personnage.`;
    document.getElementById('death-overlay').classList.add('show');
  }
}
export function closeDeath() { document.getElementById('death-overlay').classList.remove('show'); }
