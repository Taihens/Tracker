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

## Lot en cours : Lot 02 — Refactoring modulaire & Qualité

### Tâches
- [ ] Créer `src/modules/constants.js`
- [ ] Créer `src/modules/cof-classes.js`
- [ ] Créer `src/modules/storage.js` (abstraction localStorage)
- [ ] Créer `src/modules/state.js` (gestion d'état unique, indexation par ID)
- [ ] Créer `src/modules/firebase.js` (synchro Firebase, imports statiques)
- [ ] Créer `src/modules/dice.js` (jets de dés)
- [ ] Créer `src/modules/combat.js` (logique combat pure)
- [ ] Créer `src/modules/messages.js` (messagerie et logs de combat)
- [ ] Créer `src/modules/fiches.js` (fiche personnage et wizard)
- [ ] Créer `src/modules/roster.js` (ordre d'initiative et roster)
- [ ] Créer `src/modules/recap.js` (statistiques et recap)
- [ ] Créer `src/modules/ui.js` (liaisons DOM et re-rendus ciblés)
- [ ] Refactorer `src/main.js` pour orchestrer les modules (inférieur à 400 lignes)
- [ ] Bumper version `CACHE` dans `public/sw.js` (R1)
- [ ] Valider localement : lint + build + smoke tests au vert

---

## Lot suivant : Lot 04 — Tests unitaires
> À démarrer une fois le refactoring modulaire du Lot 02 validé. Priorité sur la logique de combat.
