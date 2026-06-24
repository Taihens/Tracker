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

### ✅ Lot 02d — Reste des tests unitaires [CLOTURÉ]
- **Tests dés** : `dieSVG`, `initDiceSVG`, `selectDie`, `rollDice` (crit/fumble/mod/plafond 100), `updateDiceStats`, keydown Enter → `tests/dice.test.js` (22 tests)
- **Tests state** : `rebuildCharsMap`, `getChar` (O(1) + fallback), `setState` (guard log), `initHistory`, `pushHistory` (troncature future), `undoChar`, `redoChar` → `tests/state.test.js` (20 tests)
- **Tests storage** : `loadState` (7 scénarios : v4/v3/corrompu/migration att→3att/fusion voies), `loadSettings`, `saveSettings`, `applyTheme`, `getCharPwds/setCharPwds`, `getPmAttrPref/setPmAttrPref` → `tests/storage.test.js` (19 tests)
- **Livré** : 3 nouveaux fichiers de tests · suite totale **135/135** verts · lint 0 err · build OK · R1 non applicable (tests seuls, pas de JS/CSS servi modifié).

### ✅ Lot 04 — Améliorations UX Combat (Undo & Récupération) [CLOTURÉ]
**Objectif** : Améliorer l'ergonomie et la robustesse des actions administratives majeures (Undo permanent global, support de `resetAll`) et ajouter un bouton de Point de Récupération individuel par carte.
- **Livré** : commit feat/refonte-vite · 9 fichiers · 142/142 tests · CACHE v9. Validation navigateur Taihens : ✅ OK (3 volets). Handoff `handoff06_lot04.zip`.
- **Fonctionnalités livrées** :
  - *Bouton physique Undo* : `↩ Annuler action` dans sa propre ligne, visible en mode MJ **et** Joueur.
  - *Snapshot d'état complet* : chars, log, etats, lvlUpHistory, charHistory — annulation de toutes les actions y compris `resetAll`.
  - *Gestion de la visibilité Undo* : bouton visible uniquement si snapshot disponible (MJ et Joueur).
  - *Point de Récupération individuel* : bouton `✦ Récup.` par carte, désactivé si KO ou PV max. Helper `performPointRecup` factorisé.

### ✅ Lot 05 — Qualité de vie, Offline & Sécurité [CLOTURÉ]
**Objectif** : Résoudre les vulnérabilités de sécurité critiques (XSS, PIN, clés) et implémenter des améliorations ergonomiques.
- **Livré** : 14 fichiers · **149/149 tests** · lint 0 err · build OK · CACHE v10. Validation navigateur Taihens : ✅ OK (DV D10, badges état, notes, tri initiative, PIN PBKDF2, XSS). Handoff `handoff07_lot05.zip`.
- **Sécurité** : `esc(s)` dans `messages.js` — XSS bloqué sur logs, messages et récap. PIN MJ hashé PBKDF2 (100k itérations, sel aléatoire 16 octets) via Web Crypto API, rétrocompat PIN clair. Clé Gemini migrée `localStorage` → `sessionStorage`.
- **Données** : Auto-migration UUID (`crypto.randomUUID()`) sur toutes les entrées de log sans `logId` dans `setState`.
- **Ergonomie** : `sortCharsByInitiative()` + bouton `⇅ Tri Initiative` (undoable). Badges d'état inline sur les cartes (tooltip mécanique, classe `.sev` pour états critiques). Textarea notes rapides adaptatif (`field-sizing:content`) par carte, persisté sans re-render global.
- **Note Offline-First** : `enableIndexedDbPersistence()` inexistante sur Realtime Database (API Firestore uniquement) — comportement offline déjà assuré par le double-save localStorage existant, documenté à la place d'une fausse implémentation.

### 📋 Lot 06 — Assistant IA & RAG PDF [PLANIFIÉ]
**Objectif** : Intégrer les PDF de COF sous forme de base de connaissances (RAG) et automatiser l'intégration du contexte pour l'assistant Gemini.
- **Fonctionnalités** :
  - *RAG double-index* : Index public de règles (`cof_rules_embeddings.json`) et index MJ de campagne (`cof_campaign_embeddings.json`) basés sur les PDF de la campagne Anathazerïn. Cosine similarity locale pour injecter les 3 meilleurs extraits de règles dans le prompt.
  - *Contexte de combat auto-injecté* : Gemini reçoit automatiquement le round, les PV, les états et les derniers logs sans copier-coller manuel.
  - *Récapitulatif combat narratif* : Gemini rédige un résumé romancé de la bataille à partir du journal des logs.

### 📋 Lot 07 — Importateurs & Fiches [PLANIFIÉ]
**Objectif** : Faciliter la saisie et le partage des personnages et monstres via les PDF et le format JSON.
- **Fonctionnalités** :
  - *Importateur de monstre/PNJ PDF* : Copier-coller de bloc de stats ou envoi de page PDF → Gemini convertit en JSON structuré → import immédiat.
  - *Importateur de fiche PJ (PDF)* : Lecture des champs de formulaires d'une fiche PDF officielle COF importée pour pré-remplir le personnage.
  - *Import/Export JSON* : Téléchargement et import de fiches personnages au format `.json`.
  - *Groupes & Factions* : Séparateurs visuels et filtres entre PJ, PNJ alliés et Ennemis.

### 📋 Lot 08 — Messagerie, Dés & Archiving [PLANIFIÉ]
**Objectif** : Améliorer les interactions en direct et pérenniser l'historique de jeu.
- **Fonctionnalités** :
  - *Limitation & Archivage de log (F11)* : Conservation du log courant `state.log` pour la session active uniquement (vidé à `endSession()`) ; archivage permanent des sessions dans `/sessions/{N}/log` sur Firebase ; cumul des statistiques globales des personnages dans `state.logStats`.
  - *Export du log en Markdown* : Téléchargement du journal de session actif ou des archives en format `.md`.
  - *Fiches interactives* : Clic sur le bonus d'une arme/compétence lance automatiquement le dé.
  - *Dés partagés dans le chat* : Commande `/roll` envoyant le résultat formaté dans les messages.
  - *Notifications push PWA* et *Chronomètre de round* / *Vue compacte*.

### 📋 Lot 09 — Réécriture Persistance & Synchronisation [PLANIFIÉ]
**Objectif** : Refondre l'architecture réseau pour résoudre les conflits d'écritures concurrentes et les fuites mémoire.
- **Fonctionnalités** :
  - *Firebase Delta Sync* : Remplacement des sauvegardes globales par des écritures de champs chirurgicales.
  - *Compteur d'écritures en vol (F5)* : Résolution des race conditions réseau via un compteur global plutôt qu'un flag booléen `_fbIgnoreNext`.
  - *Merge intelligent (F6)* : Résolution des conflits temporels par fusion d'identifiants de logs à la place du seuil arbitraire de 2s.
  - *Désabonnement propre (F7)* : Nettoyage des écoutes Firebase lors des changements de rôles/modes pour éviter les fuites de mémoire.

---

## Règles permanentes
Voir `CLAUDE.md` section 10 (R1-R9).
