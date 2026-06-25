#!/usr/bin/env node
// Usage: node scripts/generate-embeddings.js [GEMINI_API_KEY]
//        Or: node --env-file=.env scripts/generate-embeddings.js
// Prérequis: pdftotext (Poppler) installé et dans le PATH
//
// Sources règles : pdf/chroniques-oubliees.pdf + pdf/bestiaire COF.pdf
// Note (P4): pdf/chroniques-oubliees/ contient 5 PDF thématiques découpés.
// Sources campagne : pdf/[1-9]*.pdf (scénarios 1-9, exclut 10-13 anti-spoil)
// Modèle : text-embedding-004 (batchEmbedContents, lots de 100 chunks)

import { execSync } from 'child_process';
import { readdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const API_KEY = process.env.GEMINI_API_KEY || process.argv[2];
if (!API_KEY) {
  console.error('Usage: node scripts/generate-embeddings.js <GEMINI_API_KEY>');
  console.error('  Or:   node --env-file=.env scripts/generate-embeddings.js (Node 24+)');
  process.exit(1);
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BATCH_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${API_KEY}`;
const CHUNK_SIZE = 700;
const OVERLAP = 100;
const BATCH_SIZE = 100;   // chunks par requête batchEmbedContents
const DELAY_MS = 500;     // pause entre batches pour éviter rate-limit

function getPageCount(pdfPath) {
  try {
    const out = execSync(`pdfinfo "${pdfPath}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const m = out.match(/Pages:\s+(\d+)/);
    return m ? parseInt(m[1]) : 0;
  } catch { return 0; }
}

function extractPageText(pdfPath, page) {
  try {
    return execSync(`pdftotext -f ${page} -l ${page} "${pdfPath}" -`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch { return ''; }
}

function chunkText(text, source, page) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 50) chunks.push({ text: chunk, source, page });
    start += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

async function embedBatch(chunks, retries = 3) {
  const requests = chunks.map(c => ({
    model: 'models/text-embedding-004',
    content: { parts: [{ text: c.text }] },
  }));
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(BATCH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      return data.embeddings.map((emb, i) => ({ ...chunks[i], embedding: emb.values }));
    } catch (err) {
      if (attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}

async function embedAll(chunks) {
  const results = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const lot = chunks.slice(i, i + BATCH_SIZE);
    const embedded = await embedBatch(lot);
    results.push(...embedded);
    const done = i + lot.length;
    const pct = Math.round((done / chunks.length) * 100);
    process.stdout.write(`\r    ${done}/${chunks.length} chunks (${pct}%)   `);
    if (i + BATCH_SIZE < chunks.length) await new Promise(r => setTimeout(r, DELAY_MS));
  }
  console.log();
  return results;
}

async function processPDF(pdfPath) {
  const source = pdfPath.replace(/\\/g, '/').split('/').pop();
  console.log(`  ${source}`);
  const pages = getPageCount(pdfPath);
  if (!pages) { console.log('    → 0 pages (pdfinfo indisponible ou fichier absent)'); return []; }
  const chunks = [];
  for (let p = 1; p <= pages; p++) {
    const text = extractPageText(pdfPath, p);
    chunks.push(...chunkText(text, source, p));
  }
  console.log(`  → ${chunks.length} chunks sur ${pages} pages`);
  return embedAll(chunks);
}

async function main() {
  console.log('\n=== Génération des embeddings RAG COF (text-embedding-004) ===\n');

  console.log('--- RÈGLES ---');
  const rulesChunks = [
    ...await processPDF(join(ROOT, 'pdf', 'chroniques-oubliees.pdf')),
    ...await processPDF(join(ROOT, 'pdf', 'bestiaire COF.pdf')),
  ];
  writeFileSync(join(ROOT, 'public', 'cof_rules_embeddings.json'), JSON.stringify(rulesChunks));
  console.log(`✓ ${rulesChunks.length} chunks → public/cof_rules_embeddings.json\n`);

  console.log('--- CAMPAGNE (scénarios 1-9) ---');
  const campaignFiles = readdirSync(join(ROOT, 'pdf'))
    .filter(f => /^\d+\./i.test(f) && f.endsWith('.pdf'))
    .sort((a, b) => parseInt(a) - parseInt(b))
    .map(f => join(ROOT, 'pdf', f));
  const campaignChunks = [];
  for (const f of campaignFiles) campaignChunks.push(...await processPDF(f));
  writeFileSync(join(ROOT, 'public', 'cof_campaign_embeddings.json'), JSON.stringify(campaignChunks));
  console.log(`✓ ${campaignChunks.length} chunks → public/cof_campaign_embeddings.json\n`);

  console.log('=== Terminé ===\n');
}

main().catch(e => { console.error(e); process.exit(1); });
