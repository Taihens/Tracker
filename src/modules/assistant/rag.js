// ═══════════════════════════════════════════════════════════════
//  RAG — Retrieval-Augmented Generation (recherche vectorielle locale)
//  Séparé de gemini.js pour respecter R5 (seuil 400 lignes).
//  L'embedding de la question passe par le Worker Cloudflare (même clé serveur
//  que le chat) — aucune clé API requise côté navigateur.
// ═══════════════════════════════════════════════════════════════
import { appMode } from '../state.js';
import { GEMINI_URL } from './gemini.js';

let rulesIndex = null;
let campaignIndex = null;
let _rulesIndexPromise = null;
let _campaignIndexPromise = null;

export function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export async function loadRAGIndexes() {
  if (!_rulesIndexPromise) {
    _rulesIndexPromise = fetch('/cof_rules_embeddings.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { rulesIndex = data; })
      .catch(() => { /* SILENT-OK: fichiers RAG absents avant génération hors-ligne */ });
  }
  if (!_campaignIndexPromise && appMode === 'mj') {
    _campaignIndexPromise = fetch('/cof_campaign_embeddings.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => { campaignIndex = data; })
      .catch(() => { /* SILENT-OK: fichiers RAG absents avant génération hors-ligne */ });
  }
  await Promise.all([_rulesIndexPromise, _campaignIndexPromise].filter(Boolean));
}

export function getTopChunks(queryVec, k = 3) {
  const all = [];
  if (rulesIndex) rulesIndex.forEach(c => all.push({ text: c.text, score: cosineSimilarity(queryVec, c.embedding) }));
  if (campaignIndex) campaignIndex.forEach(c => all.push({ text: c.text, score: cosineSimilarity(queryVec, c.embedding) }));
  return all.sort((a, b) => b.score - a.score).slice(0, k);
}

// Passe par le Worker Cloudflare — la clé API est côté serveur, pas dans le navigateur.
export async function queryRAG(text) {
  if (!rulesIndex && !campaignIndex) return null;
  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-embedding-2',
        content: { parts: [{ text }] },
      }),
    });
    const data = await res.json();
    const queryVec = data?.embedding?.values;
    if (!queryVec) return null;
    const chunks = getTopChunks(queryVec, 3);
    if (!chunks.length) return null;
    return `=== CONTEXTE SUPPLÉMENTAIRE DES RÈGLES / CAMPAGNE (RAG) ===\n${chunks.map(c => c.text).join('\n---\n')}\n=== FIN RAG ===\n\n`;
  } catch { return null; /* SILENT-OK: RAG dégradé si le Worker est inaccessible */ }
}
