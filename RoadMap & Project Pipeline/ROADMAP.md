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

### 🔄 Lot 02 — Découpage src/main.js [EN COURS DE PLANIFICATION]
**Objectif** : respecter R5 (400 lignes max), améliorer maintenabilité.
Modules cibles :
- `src/modules/firebase.js` (~70 lignes)
- `src/modules/state.js` (~60 lignes)
- `src/modules/combat.js` (~200 lignes)
- `src/modules/dice.js` (~130 lignes)
- `src/modules/messages.js` (~330 lignes)
- `src/modules/fiches.js` (~180 lignes)
- `src/modules/roster.js` (~90 lignes)
- `src/modules/recap.js` (~40 lignes)
- `src/modules/ui.js` (~200 lignes)
- `src/modules/constants.js` (~350 lignes)
- `src/modules/cof-classes.js` (~400 lignes)

### 📋 Lot 03 — Configuration Vercel + Secrets [PLANIFIÉ]
- Lier repo Tracker au dashboard Vercel
- Configurer secrets GitHub Actions
- Valider premier déploiement automatique

### 📋 Lot 04 — Tests unitaires [PLANIFIÉ]
- Tests combat (dmg, heal, PM, PC)
- Tests dés (formules, historique)
- Tests state (save/load localStorage)

### 📋 Lot 05 — Fonctionnalités [À DÉFINIR PAR GÉMI]
- TBD selon besoins de la campagne

---

## Règles permanentes
Voir `CLAUDE.md` section 10 (R1-R9).
