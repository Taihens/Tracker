# task.md — Anathazerïn Tracker

## Lot en cours : Lot 01 — Scaffold + Pipeline [CLOTURÉ]

### Tâches
- [x] Extraire CSS → src/styles/main.css
- [x] Extraire JS → src/main.js
- [x] Réécrire index.html (template pur)
- [x] package.json, vite.config.js, eslint.config.js, .prettierrc
- [x] vitest.config.js + tests/smoke.test.js
- [x] .github/workflows/ci-cd.yml
- [x] CLAUDE.md, ROADMAP.md, task.md, mailbox
- [x] Clé Firebase déplacée vers import.meta.env
- [x] Push feat/refonte-vite

### À faire avant merge main
- [x] Configurer Vercel (lier repo Tracker) — projet `anathazer-tracker`
- [x] Ajouter secrets GitHub Actions (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID, VITE_FIREBASE_*) + env Vercel (prod+preview)
- [x] Ouvrir PR feat/refonte-vite → main
- [x] Valider pipeline (CI vert + deploy preview)

### Remédiation pipeline (le Lot 01 était [CLOTURÉ] mais CI jamais vert)
- [x] `package-lock.json` non tracké → ajouté (requis par `npm ci`)
- [x] Bug parsing : `setActiveTurn` déclarée 2× → suppression de la version sans garde
- [x] Bug parsing : `closeCapFull` déclarée 2× → doublon supprimé
- [x] Bug `no-dupe-keys` : clé `attrs` dupliquée (fallbacks `'—'` écrasés) → fusion des 3 sources
- [x] Test : `vitest.config.js` exigeait `jsdom` non installé → environnement `node` (smoke tests purs)
- [x] 14 blocs vides : `catch` Firebase → `console.warn` (R3), lectures locales → `// SILENT-OK`
- [x] 9 échappements regex inutiles nettoyés
- [x] 4 doublons racine supprimés (sw.js, manifest.json, icon-192/512.png) = copies de `public/`
- [x] `.gitignore` dédoublonné + `.claudeignore` créé
- [x] R1 : CACHE sw.js bumpé v5 → v6
- Résultat local : lint 0 erreur · test 3/3 · build OK

---

## Lot précédent : Lot 02a — Déplacement modulaire pur [CLOTURÉ]

### Tâches
- [x] Déplacer les constantes et magic strings → `src/modules/constants.js` (+ `constants/default-chars.js`)
- [x] Déplacer les classes COF → `src/modules/cof-classes.js`
- [x] Créer `src/modules/storage.js` (abstraction `localStorage` pure, sans modif logique)
- [x] Déplacer la logique d'état sans modif (globals + setters live-binding) → `src/modules/state.js`
- [x] Déplacer la logique Firebase → `src/modules/firebase.js`
- [x] Déplacer la logique de dés → `src/modules/dice.js`
- [x] Déplacer la logique de combat pure → `src/modules/combat.js`
- [x] Déplacer la logique de messagerie et logs → `src/modules/messages.js`
- [x] Déplacer la logique de fiches → `src/modules/fiches.js` (barrel) + `fiches/render.js` + `fiches/wizard.js` + `fiches/edit.js`
- [x] Déplacer la logique de roster/pending chars/mdp → `src/modules/roster.js`
- [x] Déplacer la logique de recap → `src/modules/recap.js`
- [x] Déplacer la logique UI & DOM → `src/modules/ui/` (render, tabs, modals, settings, etats, mode, toast)
- [x] Refactorer `src/main.js` pour importer et orchestrer les modules (210 lignes, R5)
- [x] Bumper la version `CACHE` dans `public/sw.js` v6 → v7 (R1)
- [x] Valider localement : lint 0 err · build OK (32 modules) · smoke 3/3 (iso-fonctionnalité stricte)
- [x] ⚠️ Validation navigateur manuelle (Taihens) : console sans ReferenceError, handlers critiques OK. 2 anomalies (saveEdit, Escape) prouvées pré-existantes → corrigées en bonus (commit `487c005`). Handoff regénéré sur l'état validé.

### Divergences vs liste architecte (organisationnel, esprit du scope — signalé en mailbox)
- Ajout de modules hors liste pour respecter R5 (<400 l) : `levelup.js` (+`levelup/wizard.js`, `levelup/pending.js`), `assistant.js` (+`assistant/gemini.js`, `assistant/cof-import.js`), `bindings.js`.
- **Finding window-binding** : `index.html` + template strings appellent ~123 fonctions par nom global → `bindings.js` les expose sur `window` (fonctions exportées) + 3 getters live (`appMode`, `charWizard`, `editData`, réassignées au runtime).
- **Bug évité (stale-binding)** : `pendingChars`/`pendingLvlUps` réassignés sur sync Firebase → import ES direct (live) au lieu de `window.x` (snapshot obsolète) dans `fiches/wizard.js` et `ui/render.js`.
- Helpers `fb*` co-localisés dans leur module métier plutôt qu'un `firebase.js` monolithique.
- Vérif statique anti-bouton-mort : 123 cibles inline + 32 `window.*` toutes couvertes (0 référence morte).

---

## Lot précédent : Lot 02b — Tests de caractérisation (Combat) [CLOTURÉ]
> Filet de sécurité de non-régression sur `src/modules/combat.js` avant les optimisations du Lot 02c.

### Tâches
- [x] Créer `tests/combat.test.js` (Vitest + happy-dom)
- [x] Harnais de mocks isolant : `state.js`, `firebase.js` (coupe la chaîne CDN/`import.meta.env`), `cof-classes.js`, `constants.js` + stubs `window.*` UI
- [x] Caractériser les 18 fonctions exportées (hpClass/hpColor, setDmgType, setEtat, updateCardPV, applyDmg/applyHeal, adjPM/recupPM/adjPC, adjRound, pointRecup, endRound/endCombat/endSession, resetAll/reposComplet/confirmReposComplet, setActiveTurn)
- [x] Déterminisme : stub `Math.random`/`Date.now` ; fake timers pour l'animation `healing` (900ms)
- [x] 3 bugs historiques tagués `// TODO: bug historique` (NON corrigés — réservés 02c) : crash DOM non gardé `applyDmg` (combat.js:44), collision `logId` (combat.js:52), `gain` NaN si `niveau` absent (combat.js:117)
- [x] Audit adversarial (2 agents) post-vert → branches/effets de bord complétés
- [x] Validation : `npm test` → **69/69 verts** (66 combat + 3 smoke)
- [x] ⚠️ R5 à arbitrer : `tests/combat.test.js` = 592 lignes (> 400). Arbitrage : Fichier cohésif utilisant un harnais de mock partagé complexe. Accepté exceptionnellement pour éviter la duplication inutile du harnais de test.

---

## Lot précédent : Lot 02c — Optimisations & Améliorations [CLOTURÉ]
> Indexation état O(1), modales promisifiées, imports Firebase statiques, re-rendus ciblés, 3 bugs historiques.

### Tâches
- [x] Indexation O(1) : `charsMap` + `getChar(id)` (state.js), substitution des `find` linéaires (combat/render/state)
- [x] Modales promisifiées : `showActionConfirm → Promise<boolean>` ; appelants combat.js + roster.js en async/await (compat `onConfirm`)
- [x] Imports Firebase statiques via npm ; suppression CDN dynamique (firebase.js, cof-import.js, main.js) ; réexports centralisés
- [x] Rendu DOM ciblé : `updateCardDOM` (cas A structure / cas B maj) — focus conservé pendant sync
- [x] 3 bugs historiques : garde DOM `applyDmg`, `logId` unique, fallback `niveau || 1`
- [x] Fix bonus : garde `state.log` dans `setState` (crash applyDmg si état resync sans clé log)
- [x] R1 : CACHE `sw.js` v7 → v8
- [x] Tests : `render.test.js` (5) + maj `combat.test.js` → 74/74 verts ; lint 0 err ; build OK
- [x] Validation navigateur (Taihens) : 5 volets OK (`docs/verif_navigateur_lot02c.md`)
- [x] Handoff `handoff04_lot02c.zip` (§5) ; mailbox clôture émise ; prompt 02c renommé `-clos`
- [x] Commit `489ca29`

### Hors périmètre (remonté à Gémi)
- Undo permanent / bouton physique (5 actions + resetAll) → lot dédié (spec Gémi reçue)
- Point de Récupération individuel par perso → en attente spec
- 3 fichiers reformatés cosmétiquement (index.html, ui/mode.js, styles/main.css) exclus du commit → chore format ou revert à arbitrer

---

## Lot suivant : Lot 02d — Reste des tests unitaires
> Tests unitaires restants (dés, stockage et état) après finalisation des optimisations.
