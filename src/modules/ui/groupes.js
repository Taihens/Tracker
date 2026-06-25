// ═══════════════════════════════════════════════════════════════
//  GROUPES — tri et filtrage des personnages par faction
//  Valeurs de groupe : 'PJ' | 'PNJ_allié' | 'Ennemi'
//  Les chars sans groupe sont traités comme 'PJ' (backward compat).
// ═══════════════════════════════════════════════════════════════

export const GROUPE_ORDER = ['PJ', 'PNJ_allié', 'Ennemi'];
export const GROUPE_LABELS = { PJ: '⚔ PJ', PNJ_allié: '🤝 PNJ Alliés', Ennemi: '💀 Ennemis' };

let _activeFilters = new Set();

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

export function getActiveGroupFilter() { return _activeFilters; }

export function setGroupFilter(g) {
  if (_activeFilters.has(g)) { _activeFilters.delete(g); } else { _activeFilters.add(g); }
  if (typeof window.renderRoster === 'function') window.renderRoster();
}

export function clearGroupFilter() {
  _activeFilters.clear();
  if (typeof window.renderRoster === 'function') window.renderRoster();
}

export function applyGroupFilter(chars) {
  if (_activeFilters.size === 0) return chars;
  return chars.filter(c => _activeFilters.has(c.groupe || 'PJ'));
}

export function renderGroupFilterBar() {
  return `<div class="roster-filter-bar">
    ${GROUPE_ORDER.map(g => `<button class="btn roster-filter-btn${_activeFilters.has(g) ? ' active' : ''}" onclick="setGroupFilter('${g}')">${GROUPE_LABELS[g]}</button>`).join('')}
    ${_activeFilters.size > 0 ? `<button class="btn roster-filter-btn" onclick="clearGroupFilter()">✕ Tout</button>` : ''}
  </div>`;
}
