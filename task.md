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

## Lot suivant : Lot 02c — Optimisations & Améliorations
> Optimisation de l'état (indexation ID O(1)), async/await IA Gemini, imports statiques Firebase, re-rendus ciblés.

---

## Lot suivant : Lot 02d — Reste des tests unitaires
> Tests unitaires restants (dés, stockage et état) après finalisation des optimisations.
