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

### ✅ Lot 02b — Tests de caractérisation (Combat) [CLOTURÉ]
**Objectif** : Mettre en place un filet de sécurité de tests automatisés avant toute optimisation du comportement.
- **Couverture prioritaire** : tests unitaires complets sur la logique de combat du module `src/modules/combat.js` (calculs de dégâts, soins, PV/PM/PC, gestion des états).
- **Livré** : `tests/combat.test.js` — 66 tests verts (18 fonctions caractérisées), Vitest + happy-dom, mocks isolant state/firebase/cof-classes/constants. 3 bugs historiques tagués, non corrigés (réservés Lot 02c). Suite totale : 69/69.

### ✅ Lot 02c — Optimisations & Améliorations [CLOTURÉ]
**Objectif** : Améliorations de performance, réécriture comportementale et refonte de l'état.
- **Optimisations livrées** :
  - *État* : Indexation de `state.chars` par ID ($O(1)$) via `charsMap` + `getChar(id)`.
  - *Dialogues* : Modales de confirmation promisifiées (`showActionConfirm → Promise`, `async/await`) — fin du callback hell.
  - *Firebase* : Imports statiques via package npm (suppression des imports CDN dynamiques) — validé 0 requête `firebasejs`.
  - *Rendu* : Re-rendus DOM ciblés (`updateCardDOM`, cas A/B) — focus/saisie conservés pendant sync.
  - *3 bugs historiques* : garde DOM `applyDmg`, `logId` unique, fallback `niveau || 1`.
- **Livré** : commit `489ca29` ; tests **74/74** (ajout `render.test.js`) · lint 0 err · build OK. R1 : CACHE `sw.js` v7→v8.
- **Fix bonus (validation)** : `state.log` undefined → crash `applyDmg` (Firebase n'écrit pas les tableaux vides) → garde dans `setState`.
- **Validation navigateur (Taihens)** : ✅ OK, 5 volets (`docs/verif_navigateur_lot02c.md`). Handoff `handoff04_lot02c.zip`.
- **Remontées hors scope** → Gémi : undo permanent (Lot dédié), point de récup individuel (en attente).

### 📋 Lot 02d — Reste des tests unitaires [PLANIFIÉ]
- **Tests dés** (formules de jets, historique)
- **Tests state / storage** (sauvegarde, chargement, migrations et abstraction localStorage)

### 📋 Lot 04 — Annulation permanente des actions [PLANIFIÉ]
**Objectif** : Remplacer la barre d'annulation temporaire de 12 secondes par un bouton d'annulation physique permanent et robuste sur le tableau de bord MJ, et supporter l'annulation complète de la réinitialisation (`resetAll`).
- **Fonctionnalités** :
  - *Bouton physique* : Intégration d'un bouton d'annulation permanent dans la ligne d'actions MJ du Tableau de bord.
  - *Snapshot d'état complet* : Remplacement du snapshot partiel par un snapshot d'état complet de l'application (personnages, logs, historiques) pour permettre l'annulation de toutes les actions, y compris `resetAll`.
  - *Gestion de la visibilité* : Affichage dynamique du bouton uniquement si un snapshot d'annulation est disponible localement pour le MJ.

### 📋 Lot 05 — Fonctionnalités [À DÉFINIR PAR GÉMI]
- TBD selon besoins de la campagne

---

## Règles permanentes
Voir `CLAUDE.md` section 10 (R1-R9).
