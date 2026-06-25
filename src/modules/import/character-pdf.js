// ═══════════════════════════════════════════════════════════════
//  IMPORTATEUR FICHE PJ (PDF) — fiche COF officielle → JSON fiche
//  Stratégie : 1) champs AcroForm ; 2) fallback extraction texte + Gemini
//  R4 : thinkingBudget:0 sur tout appel Gemini.
// ═══════════════════════════════════════════════════════════════
import { GEMINI_URL } from '../assistant/gemini.js';
import { state, rebuildCharsMap } from '../state.js';
import { save } from '../firebase.js';
import { getPdfjsLib, extractTextFromPdf } from './pdf-loader.js';

const SYSTEM_PROMPT = `Tu es un extracteur de fiche de personnage COF (Chroniques Oubliées Fantasy).
À partir du texte d'une fiche officielle, retourne UNIQUEMENT un objet JSON valide sans markdown ni explication.
Schéma exact (types stricts) :
{
  "name": "string",
  "classe": "string",
  "race": "string",
  "niveau": number,
  "pvMax": number, "pvActuel": number,
  "pmMax": number, "pmActuel": number,
  "pcMax": number, "pcActuel": number,
  "def": number,
  "init": "string (+X)",
  "att": "string (+X)",
  "degats": "string",
  "vitesse": "string (ex: 9m)",
  "dv": "string (ex: D8)",
  "attrs": {"FOR":"+X","DEX":"+X","CON":"+X","INT":"+X","SAG":"+X","CHA":"+X"},
  "armes": [{"nom":"string","att":"string","dmg":"string","spec":"string"}],
  "voies": [{"nom":"string","caps":[{"r":"R1","ok":boolean,"nom":"string","desc":"string","descFull":"string"}]}],
  "raciales": ["string"],
  "resume": [],
  "groupe": "PJ",
  "etat": "Normal",
  "present": true
}
Règles : modificateurs en "+X" ou "0" ou "-X". pvActuel = pvMax si la fiche est vierge.`;

let _previewChar = null;

function nextId() {
  if (!state.chars.length) return 1;
  return Math.max(...state.chars.map(c => c.id)) + 1;
}

async function tryAcroForm(file) {
  const lib = await getPdfjsLib();
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: buf }).promise;
  const fields = {};
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const annots = await page.getAnnotations();
    for (const a of annots) {
      if (a.fieldName && a.fieldValue !== undefined) {
        fields[a.fieldName] = a.fieldValue;
      }
    }
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

function mapAcroFields(fields) {
  // Tentative de mapping des noms de champs COF officiels connus
  const get = (...keys) => {
    for (const k of keys) {
      const v = fields[k] || fields[k.toLowerCase()] || fields[k.toUpperCase()];
      if (v !== undefined && v !== '') return String(v).trim();
    }
    return '';
  };
  const num = (...keys) => { const v = get(...keys); return parseInt(v) || 0; };
  return {
    name: get('Nom', 'nom', 'NOM', 'name'),
    classe: get('Classe', 'CLASSE', 'classe'),
    race: get('Race', 'RACE', 'race'),
    niveau: num('Niveau', 'NIVEAU', 'niveau'),
    pvMax: num('PV max', 'PVmax', 'pvMax', 'PV_max'),
    pvActuel: num('PV actuels', 'PVactuels', 'pvActuel', 'PV_actuels') || num('PV max', 'PVmax', 'pvMax'),
    pmMax: num('PM max', 'PMmax', 'pmMax'),
    pmActuel: num('PM actuels', 'pmActuel') || num('PM max', 'PMmax', 'pmMax'),
    pcMax: num('PC max', 'pcMax'),
    pcActuel: num('PC actuels', 'pcActuel') || num('PC max', 'pcMax'),
    def: num('DEF', 'Défense', 'defense'),
    init: get('Initiative', 'INIT', 'init') || '+0',
    att: get('Attaque', 'ATT', 'att') || '+0',
    degats: get('Dégâts', 'Degats', 'DMG', 'degats') || '1d6',
    vitesse: get('Vitesse', 'VIT', 'vitesse') || '9m',
    dv: get('DV', 'dv') || 'D8',
    attrs: {
      FOR: get('FOR', 'Force') || '0',
      DEX: get('DEX', 'Dextérité') || '0',
      CON: get('CON', 'Constitution') || '0',
      INT: get('INT', 'Intelligence') || '0',
      SAG: get('SAG', 'Sagesse') || '0',
      CHA: get('CHA', 'Charisme') || '0',
    },
    armes: [], voies: [], raciales: [], resume: [],
    groupe: 'PJ', etat: 'Normal', present: true,
  };
}

async function callGemini(text) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: { maxOutputTokens: 8192, temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } }, // R4 — 8192 nécessaire pour fiche COF complète avec voies
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(raw.replace(/```(?:json)?\n?/g, '').trim());
}

function renderPreview(char) {
  _previewChar = { ...char };
  const el = document.getElementById('char-pdf-preview');
  if (!el) return;
  el.innerHTML = `<pre style="font-size:10px;color:var(--txt2);white-space:pre-wrap;max-height:280px;overflow:auto;background:var(--bg3);padding:10px;border-radius:2px">${JSON.stringify(char, null, 2)}</pre>`;
  const btn = document.getElementById('char-pdf-import-confirm');
  if (btn) btn.style.display = '';
}

export function openCharPDFImport() {
  const overlay = document.getElementById('char-pdf-import-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  const preview = document.getElementById('char-pdf-preview');
  if (preview) preview.innerHTML = '';
  const btn = document.getElementById('char-pdf-import-confirm');
  if (btn) btn.style.display = 'none';
  _previewChar = null;
  document.getElementById('char-pdf-status').textContent = '';
}

export function closeCharPDFImport() {
  const overlay = document.getElementById('char-pdf-import-overlay');
  if (overlay) overlay.style.display = 'none';
  _previewChar = null;
}

export async function analyzeCharPdf(input) {
  const f = input.files[0]; if (!f) return;
  const statusEl = document.getElementById('char-pdf-status');
  const btn = document.getElementById('char-pdf-analyze-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Lecture…'; }
  if (statusEl) statusEl.textContent = 'Lecture du PDF…';
  try {
    // Tentative 1 : AcroForm
    const fields = await tryAcroForm(f);
    if (fields) {
      if (statusEl) statusEl.textContent = `${Object.keys(fields).length} champs AcroForm détectés…`;
      const char = mapAcroFields(fields);
      if (char.name && char.pvMax > 0 && char.niveau > 0) { renderPreview(char); return; }
      if (statusEl) statusEl.textContent = `AcroForm incomplet (pvMax=${char.pvMax}, niv=${char.niveau}) — fallback Gemini…`;
    }
    // Fallback : extraction texte + Gemini
    if (statusEl) statusEl.textContent = 'Extraction texte + analyse Gemini…';
    const text = await extractTextFromPdf(f, 10);
    if (!text.trim()) throw new Error('Aucun texte extrait du PDF');
    const char = await callGemini(text);
    renderPreview(char);
    window.toast('Fiche analysée — vérifiez avant d\'importer', 't-i');
  } catch (err) {
    window.toast(`Erreur : ${err.message}`, 't-w');
    if (statusEl) statusEl.textContent = `Erreur : ${err.message}`;
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📋 Analyser la fiche'; }
    if (input) input.value = '';
  }
}

export function confirmCharPDFImport() {
  if (!_previewChar) return;
  const c = { ..._previewChar };
  if (!c.id || state.chars.some(x => x.id === c.id)) c.id = nextId();
  c.groupe = c.groupe || 'PJ';
  c.etat = c.etat || 'Normal';
  c.present = typeof c.present === 'boolean' ? c.present : true;
  state.chars.push(c);
  rebuildCharsMap();
  save();
  window.render();
  if (typeof window.renderRoster === 'function') window.renderRoster();
  closeCharPDFImport();
  window.toast(`${c.name} importé`, 't-i');
}
