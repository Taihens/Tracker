// ═══════════════════════════════════════════════════════════════
//  GROUPES — tri et filtrage des personnages par faction
//  Valeurs de groupe : 'PJ' | 'PNJ_allié' | 'Ennemi'
//  Les chars sans groupe sont traités comme 'PJ' (backward compat).
// ═══════════════════════════════════════════════════════════════

export const GROUPE_ORDER = ['PJ', 'PNJ_allié', 'Ennemi'];
export const GROUPE_LABELS = { PJ: '⚔ PJ', PNJ_allié: '🤝 PNJ Alliés', Ennemi: '💀 Ennemis' };

let _activeFilter = null;

export function groupChars(chars) {
  const groups = { PJ: [], PNJ_allié: [], Ennemi: [] };
  for (const c of chars) {
    const g = c.groupe || 'PJ';
    if (!groups[g]) groups[g] = [];
    groups[g].push(c);
  }
  return groups;
}

export function renderGroupHeader(label) {
  return `<div class="roster-group-header">${label}</div>`;
}

export function getActiveGroupFilter() { return _activeFilter; }

export function setGroupFilter(g) {
  _activeFilter = (_activeFilter === g) ? null : g;
  if (typeof window.renderRoster === 'function') window.renderRoster();
}

export function clearGroupFilter() {
  _activeFilter = null;
  if (typeof window.renderRoster === 'function') window.renderRoster();
}

export function applyGroupFilter(chars) {
  if (!_activeFilter) return chars;
  return chars.filter(c => (c.groupe || 'PJ') === _activeFilter);
}

export function renderGroupFilterBar() {
  const active = _activeFilter;
  return `<div class="roster-filter-bar">
    ${GROUPE_ORDER.map(g => `<button class="btn roster-filter-btn${active === g ? ' active' : ''}" onclick="setGroupFilter('${g}')">${GROUPE_LABELS[g]}</button>`).join('')}
    ${active ? `<button class="btn roster-filter-btn" onclick="clearGroupFilter()">✕ Tout</button>` : ''}
  </div>`;
}
