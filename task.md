# task.md — Anathazerïn Tracker

## 📋 Lot en cours : Lot 06 — Assistant IA & RAG PDF [CLOTURÉ ✅]

### Tâches
- [x] RAG : Créer le script de génération d'embeddings `scripts/generate-embeddings.js` (extraction PDF via `pdftotext` + Embedding API)
- [ ] RAG : Générer et stocker les fichiers d'embeddings `public/cof_rules_embeddings.json` et `public/cof_campaign_embeddings.json` (scénarios 1-9) — à exécuter manuellement : `npm run generate-embeddings <API_KEY>`
- [x] RAG : Charger les index RAG dans l'application au démarrage ou à l'ouverture de l'onglet Assistant (`loadRAGIndexes` dans `initAssistantTab`)
- [x] RAG : Implémenter la recherche vectorielle locale (cosine similarity) dans `src/modules/assistant/rag.js` (module dédié, R5)
- [x] RAG : Injecter les 3 chunks les plus pertinents dans la question posée à Gemini dans le prompt système (`queryRAG` dans `sendAI`)
- [x] Contexte Combat : Enrichir `buildAiContext()` dans `gemini.js:117` pour auto-injecter les 10 dernières lignes de logs de combat
- [x] Récit de Combat : Bouton "✨ Récit de combat IA" (MJ uniquement) dans `messages.js:219` + `generateNarrativeSummary()` avec `thinkingBudget:0`
- [x] Tests & Qualité : `tests/assistant.test.js` — 12 tests (cosineSimilarity, getTopChunks, buildAiContext) — 161/161 ✅

---

## 🏛️ Historique des Lots [CLOTURÉS]
* **Lot 01 — Scaffold + Pipeline** : Clôturé ✅ (Commit base refonte Vite)
* **Lot 02a — Déplacement modulaire pur** : Clôturé ✅ (32 modules ES6 autonomes)
* **Lot 02b — Tests de caractérisation (Combat)** : Clôturé ✅ (69 tests unitaires combat)
* **Lot 02c — Optimisations & Améliorations** : Clôturé ✅ (Indexation O(1), Modales promesses, Firebase npm)
* **Lot 02d — Reste des tests unitaires** : Clôturé ✅ (135 tests unitaires)
* **Lot 04 — Améliorations UX Combat (Undo & Récupération)** : Clôturé ✅ (Bouton Undo global, point de récup individuel)
* **Lot 05 — Qualité de vie, Offline & Sécurité** : Clôturé ✅ (PBKDF2, notes adaptatives, tri initiative, XSS, Chevalier DV)
* **Lot 06 — Assistant IA & RAG PDF** : Clôturé ✅ (RAG 3 526 chunks, logs combat auto-injectés, récit narratif IA, Worker sans clé client)
