# ROADMAP — Anathazerïn Tracker

## Vision
PWA TTRPG (Chroniques Oubliées Fantasy) — suivi de combat MJ/Joueurs, dés, fiches personnages, messagerie privée, assistant Gemini. Déployée sur Vercel, synchronisée via Firebase Realtime Database.

## État actuel
- **Branche** : `feat/refonte-vite`
- **Déploiement** : GitHub Pages (main) → migration Vercel en cours
- **Stack** : Vanilla JS + Vite 6 + Firebase Realtime DB + PWA

---

## Lots

### ✅ Lot 01 — Scaffold + Pipeline [CLOTURÉ]
- Extraction CSS → `src/styles/main.css`
- Extraction JS → `src/main.js`
- `index.html` template pur
- Vite 6, ESLint 9, Prettier, Vitest
- `.github/workflows/ci-cd.yml` : lint → test → build → deploy Vercel
- Workflow Antigravity : CLAUDE.md, ROADMAP, task.md, mailbox

### 🔄 Lot 02 — Refactoring modulaire & Qualité [EN COURS]
**Objectif** : Respecter R5 (400 lignes max), découpler la logique métier du DOM, et assainir l'architecture.
- **Découpage modulaire** :
  - `src/modules/firebase.js` (Synchro et config Firebase, avec imports statiques)
  - `src/modules/state.js` (Gestion de l'état global namespacé et structuré, indexation de `state.chars` par ID)
  - `src/modules/storage.js` (Abstraction `localStorage` et constantes de clés)
  - `src/modules/combat.js` (Logique de combat : dégâts, soins, PV/PM/PC)
  - `src/modules/dice.js` (Lancés de dés et formules)
  - `src/modules/messages.js` (Messagerie privée et logs)
  - `src/modules/fiches.js` (Fiches de personnages et classes)
  - `src/modules/roster.js` (Gestion de l'ordre de combat/roster)
  - `src/modules/recap.js` (Recapitulatifs de combat)
  - `src/modules/ui.js` (Gestion des événements DOM et affichages)
  - `src/modules/constants.js` (Constantes, magic strings nettoyées)
  - `src/modules/cof-classes.js` (Données brutes des classes COF)
- **Choix techniques et Remédiations** :
  - *Rendu* : Approche par **re-rendus ciblés** (mise à jour sélective d'éléments DOM ciblés par ID/classe au lieu d'un re-rendu global systématique).
  - *Firebase* : Remplacement des imports Firebase dynamiques par des imports statiques.
  - *État* : Regroupement des variables globales volantes dans un namespace unique. Indexation des personnages par ID (O(1)) au lieu de O(n).
  - *IA Gemini* : Remplacement du callback hell (`.then().then()`) par `async/await`.

### ✅ Lot 03 — Configuration Vercel + Secrets [CLOTURÉ]
- Repo lié au projet Vercel `anathazer-tracker`
- Déploiement via **intégration GitHub native Vercel** (PR → preview · main → prod)
- Variables Firebase configurées (GitHub secrets pour le build + env Vercel prod/preview)
- Workflow simplifié : gate qualité lint/test/build uniquement (jobs deploy custom retirés — l'action `amondnet/vercel-action@v25` épinglait un CLI obsolète et faisait doublon avec l'intégration native)

### 📋 Lot 04 — Tests unitaires [PLANIFIÉ]
- **Priorité 1 : Tests combat** (dmg, heal, calculs PV/PM/PC, états) — le module le plus critique et risqué
- **Priorité 2 : Tests dés** (formules de jets, historique)
- **Priorité 3 : Tests state / storage** (sauvegarde, chargement, migrations et abstraction localStorage)

### 📋 Lot 05 — Fonctionnalités [À DÉFINIR PAR GÉMI]
- TBD selon besoins de la campagne

---

## Règles permanentes
Voir `CLAUDE.md` section 10 (R1-R9).
