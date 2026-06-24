# task.md — Anathazerïn Tracker

## 📋 Lot en cours : Lot 07 — Importateurs & Fiches [PLANIFIÉ ⏳]

### Tâches
- [ ] Import : Convertir bloc de stats ou page PDF de monstres/PNJ en JSON structuré via Gemini
- [ ] Import : Lire les champs de formulaires d'une fiche PDF officielle COF
- [ ] Données : Import/Export de fiches personnages au format JSON
- [ ] UI : Séparateurs visuels et filtres entre PJ, PNJ alliés et Ennemis
- [ ] RAG : Implémenter le batching local (`batchEmbedContents` par lots de 100) dans `scripts/generate-embeddings.js` (clé API `.env` en local, bypass Worker)
- [ ] RAG : Switcher vers le modèle `text-embedding-004` (dans `rag.js` et `generate-embeddings.js`) et régénérer les index

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
