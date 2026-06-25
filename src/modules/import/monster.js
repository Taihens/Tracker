// ═══════════════════════════════════════════════════════════════
//  IMPORTATEUR MONSTRE/PNJ — texte collé ou PDF → Gemini → fiche
//  R4 : thinkingBudget:0 sur tout appel Gemini.
// ═══════════════════════════════════════════════════════════════
import { GEMINI_URL } from '../assistant/gemini.js';
import { state, rebuildCharsMap } from '../state.js';
import { save } from '../firebase.js';
import { extractTextFromPdf } from './pdf-loader.js';

const SYSTEM_PROMPT = `Tu es un convertisseur de statistiques COF (Chroniques Oubliées Fantasy) vers JSON.
Analyse le bloc de statistiques fourni et retourne UNIQUEMENT un objet JSON valide, sans texte avant ou après, sans bloc markdown.
Le JSON doit correspondre exactement à ce schéma (types stricts) :
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
  "degats": "string (ex: 1d8+4)",
  "vitesse": "string (ex: 9m)",
  "dv": "string (ex: D8)",
  "attrs": {"FOR":"+X","DEX":"+X","CON":"+X","INT":"+X","SAG":"+X","CHA":"+X"},
  "armes": [{"nom":"string","att":"string","dmg":"string","spec":"string"}],
  "voies": [],
  "raciales": ["string"],
  "resume": [],
  "groupe": "Ennemi",
  "etat": "Normal",
  "present": true
}
Règles : modificateurs sous forme "+X" ou "0" ou "-X". pmMax/pcMax à 0 si absent. groupe="Ennemi" sauf si clairement allié.`;

let _previewChar = null;

function nextId() {
  if (!state.chars.length) return 1;
  return Math.max(...state.chars.map(c => c.id)) + 1;
}

async function callGemini(userText) {
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash',
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userText }] }],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } }, // R4
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return JSON.parse(raw.replace(/```(?:json)?\n?/g, '').trim());
}

function renderPreview(char) {
  _previewChar = { ...char };
  const el = document.getElementById('monster-preview');
  if (!el) return;
  el.innerHTML = `<pre style="font-size:10px;color:var(--txt2);white-space:pre-wrap;max-height:280px;overflow:auto;background:var(--bg3);padding:10px;border-radius:2px">${JSON.stringify(char, null, 2)}</pre>`;
  const btn = document.getElementById('monster-import-confirm');
  if (btn) btn.style.display = '';
}

export function openMonsterImport() {
  const overlay = document.getElementById('monster-import-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  const inp = document.getElementById('monster-text-input');
  if (inp) inp.value = '';
  const preview = document.getElementById('monster-preview');
  if (preview) preview.innerHTML = '';
  const btn = document.getElementById('monster-import-confirm');
  if (btn) btn.style.display = 'none';
  _previewChar = null;
  showMonsterTab('text');
}

export function closeMonsterImport() {
  const overlay = document.getElementById('monster-import-overlay');
  if (overlay) overlay.style.display = 'none';
  _previewChar = null;
}

export function showMonsterTab(tab) {
  ['text', 'pdf'].forEach(t => {
    const panel = document.getElementById(`monster-tab-${t}`);
    const btn = document.getElementById(`monster-tab-btn-${t}`);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
}

export async function analyzeMonsterText() {
  const text = document.getElementById('monster-text-input')?.value?.trim();
  if (!text) { window.toast('Collez les statistiques du monstre', 't-w'); return; }
  const btn = document.getElementById('monster-analyze-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Analyse…'; }
  try {
    const char = await callGemini(text);
    renderPreview(char);
    window.toast('Preview prête — vérifiez avant d\'importer', 't-i');
  } catch (err) {
    window.toast(`Analyse échouée : ${err.message}`, 't-w');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '⚡ Analyser'; }
  }
}

export async function analyzeMonsterPdf(input) {
  const f = input.files[0]; if (!f) return;
  const btn = document.getElementById('monster-pdf-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Extraction…'; }
  try {
    const text = await extractTextFromPdf(f, 5);
    if (!text.trim()) throw new Error('Aucun texte extrait du PDF');
    const char = await callGemini(text);
    renderPreview(char);
    window.toast('PDF analysé — vérifiez avant d\'importer', 't-i');
  } catch (err) {
    window.toast(`Erreur PDF : ${err.message}`, 't-w');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '📄 Analyser PDF'; }
    if (input) input.value = '';
  }
}

export function confirmMonsterImport() {
  if (!_previewChar) return;
  const c = { ..._previewChar };
  if (!c.id || state.chars.some(x => x.id === c.id)) c.id = nextId();
  c.groupe = c.groupe || 'Ennemi';
  c.etat = c.etat || 'Normal';
  c.present = typeof c.present === 'boolean' ? c.present : true;
  state.chars.push(c);
  rebuildCharsMap();
  save();
  window.render();
  if (typeof window.renderRoster === 'function') window.renderRoster();
  closeMonsterImport();
  window.toast(`${c.name} importé (${c.groupe})`, 't-i');
}
