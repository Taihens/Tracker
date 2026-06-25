// ═══════════════════════════════════════════════════════════════
//  IMPORT/EXPORT JSON — export de fiches perso + import individuel
//  Différent du backup global (settings.js:exportData) : opère sur
//  les chars uniquement et ajoute sans écraser l'état existant.
// ═══════════════════════════════════════════════════════════════
import { state, rebuildCharsMap } from '../state.js';
import { save } from '../firebase.js';

const REQUIRED_FIELDS = ['name', 'pvMax', 'pvActuel'];

function sanitizeStr(v) {
  return typeof v === 'string' ? v.replace(/<[^>]*>/g, '') : v;
}

function sanitizeDeep(val) {
  if (typeof val === 'string') return sanitizeStr(val);
  if (Array.isArray(val)) return val.map(sanitizeDeep);
  if (val && typeof val === 'object') {
    const out = {};
    for (const k of Object.keys(val)) out[k] = sanitizeDeep(val[k]);
    return out;
  }
  return val;
}

function validateChar(c) {
  return c && typeof c === 'object' &&
    REQUIRED_FIELDS.every(f => c[f] !== undefined && c[f] !== null);
}

function nextId() {
  if (!state.chars.length) return 1;
  return Math.max(...state.chars.map(c => c.id)) + 1;
}

export function exportCharsJSON() {
  const blob = new Blob([JSON.stringify(state.chars, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `anathazerín-persos-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  window.toast('Personnages exportés', 't-i');
}

export function exportCharJSON(id) {
  const c = state.chars.find(x => x.id === id);
  if (!c) return;
  const blob = new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const slug = (c.name || 'perso').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  a.download = `${slug || 'perso'}.json`;
  a.click();
  window.toast(`${c.name} exporté`, 't-i');
}

export function importCharsJSON(input) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      const incoming = Array.isArray(parsed) ? parsed : [parsed];
      const valid = incoming.filter(validateChar);
      if (!valid.length) throw new Error('Aucun personnage valide trouvé');
      let added = 0;
      for (const raw of valid) {
        const c = sanitizeDeep({ ...raw });
        if (state.chars.some(x => x.id === c.id)) c.id = nextId();
        if (!c.groupe) c.groupe = 'PJ';
        c.etat = c.etat || 'Normal';
        c.present = typeof c.present === 'boolean' ? c.present : true;
        state.chars.push(c);
        added++;
      }
      rebuildCharsMap();
      save();
      window.render();
      if (typeof window.renderRoster === 'function') window.renderRoster();
      window.toast(`${added} personnage(s) importé(s)`, 't-i');
    } catch (err) {
      window.toast(`Import échoué : ${err.message}`, 't-w');
    }
  };
  r.onerror = () => window.toast('Erreur de lecture du fichier', 't-w');
  r.readAsText(f);
  input.value = '';
}
