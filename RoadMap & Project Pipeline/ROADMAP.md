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
### ✅ Lot 03 — Configuration Vercel + Secrets [CLOTURÉ]
- Repo lié au projet Vercel `anathazer-tracker`
- Déploiement via **intégration GitHub native Vercel** (PR → preview · main → prod)
- Variables Firebase configurées (GitHub secrets pour le build + env Vercel prod/preview)
- Workflow simplifié : gate qualité lint/test/build uniquement (jobs deploy custom retirés — l'action `amondnet/vercel-action@v25` épinglait un CLI obsolète et faisait doublon avec l'intégration native)

### ✅ Lot 02a — Déplacement modulaire pur [CLOTURÉ]
**Objectif** : Découper le monolithe `src/main.js` en modules ES6 (moins de 400 lignes chacun, R5) sans aucun changement de comportement ni de logique métier.
- **Livré** : `src/main.js` 3678 → 210 lignes ; 29 fichiers sous `src/modules/` (tous <400 l) ; `bindings.js` (expose les fonctions inline sur `window` + 3 getters live). lint 0 err · build OK (32 modules) · smoke 3/3. R1 fait (CACHE v6→v7). Commit refonte `0652177`.
- **Validation navigateur (Taihens)** : ✅ OK. 2 anomalies trouvées (saveEdit, Escape) prouvées **pré-existantes** (byte-identiques au monolithe) → refonte iso-fonctionnelle confirmée ; corrigées en bonus (commit `487c005`). Handoff `handoff02_lot02a-modularisation.zip` regénéré sur l'état validé.
- **Modules cibles** : `constants.js`, `cof-classes.js`, `storage.js`, `state.js`, `firebase.js`, `dice.js`, `combat.js`, `messages.js`, `fiches.js`, `roster.js`, `recap.js`, `ui.js`.
- **Sens des dépendances imposé** :
  - `constants.js` / `cof-classes.js` (feuilles) -> `storage.js` -> `state.js` / `firebase.js` -> modules métiers (`dice.js`, `combat.js`, `messages.js`, `fiches.js`, `roster.js`, `recap.js`) -> `ui.js` -> `main.js`.
  - Pas d'import circulaire autorisé. `ui.js` gère seul le DOM et importe les autres, pas l'inverse.
- **Sous-découpage R5** : Si un module (comme `ui.js` ou `combat.js`) menace de dépasser 400 lignes, le sous-découper immédiatement (ex: `src/modules/ui/events.js`, etc.).
- **Validation** : Strictement iso-fonctionnel. L'application doit fonctionner à l'identique.

### 📋 Lot 02b — Tests de caractérisation (Combat) [PLANIFIÉ]
**Objectif** : Mettre en place un filet de sécurité de tests automatisés avant toute optimisation du comportement.
- **Couverture prioritaire** : tests unitaires complets sur la logique de combat du module `src/modules/combat.js` (calculs de dégâts, soins, PV/PM/PC, gestion des états).

### 📋 Lot 02c — Optimisations & Améliorations [PLANIFIÉ]
**Objectif** : Améliorations de performance, réécriture comportementale et refonte de l'état.
- **Optimisations** :
  - *État* : Indexation de `state.chars` par ID ($O(1)$) au lieu de boucles linéaires.
  - *IA Gemini* : Passage en `async/await` pour supprimer le callback hell.
  - *Firebase* : Remplacement des imports Firebase dynamiques par des imports statiques.
  - *Rendu* : Optimisation des re-rendus DOM (re-rendus ciblés par ID/classe au lieu de re-rendus globaux).

### 📋 Lot 02d — Reste des tests unitaires [PLANIFIÉ]
- **Tests dés** (formules de jets, historique)
- **Tests state / storage** (sauvegarde, chargement, migrations et abstraction localStorage)

### 📋 Lot 04 — Fonctionnalités [À DÉFINIR PAR GÉMI]
- TBD selon besoins de la campagne

---

## Règles permanentes
Voir `CLAUDE.md` section 10 (R1-R9).
