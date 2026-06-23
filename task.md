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

## Lot en cours : Lot 02a — Déplacement modulaire pur

### Tâches
- [ ] Déplacer les constantes et magic strings → `src/modules/constants.js`
- [ ] Déplacer les classes COF → `src/modules/cof-classes.js`
- [ ] Créer `src/modules/storage.js` (abstraction `localStorage` pure, sans modif logique)
- [ ] Déplacer la logique d'état sans modif (variables globales regroupées de manière minimale) → `src/modules/state.js`
- [ ] Déplacer la logique Firebase → `src/modules/firebase.js`
- [ ] Déplacer la logique de dés → `src/modules/dice.js`
- [ ] Déplacer la logique de combat pure → `src/modules/combat.js`
- [ ] Déplacer la logique de messagerie et logs → `src/modules/messages.js`
- [ ] Déplacer la logique de fiches → `src/modules/fiches.js`
- [ ] Déplacer la logique de roster/initiative → `src/modules/roster.js`
- [ ] Déplacer la logique de recap → `src/modules/recap.js`
- [ ] Déplacer la logique UI & DOM → `src/modules/ui.js` (sous-découper si >400 lignes)
- [ ] Refactorer `src/main.js` pour importer et orchestrer les modules (<400 lignes, R5)
- [ ] Bumper la version `CACHE` dans `public/sw.js` (R1)
- [ ] Valider localement : lint + build + smoke tests au vert (iso-fonctionnalité stricte)

---

## Lot suivant : Lot 04a — Tests de caractérisation (Combat)
> À exécuter immédiatement après le Lot 02a pour garantir la non-régression du module critique de combat.

---

## Lot suivant : Lot 02b — Optimisations & Améliorations
> Optimisation de l'état (indexation ID O(1)), async/await IA Gemini, imports statiques Firebase, re-rendus ciblés.

---

## Lot suivant : Lot 04 — Tests unitaires
> À démarrer une fois le refactoring modulaire du Lot 02 validé. Priorité sur la logique de combat.
