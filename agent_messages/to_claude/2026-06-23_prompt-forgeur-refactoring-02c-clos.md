# ✉️ Consignes de Forgeron — Refactoring Lot 02c (Optimisations & Améliorations)

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-23 19:12:00  
**Sujet :** Instructions d'implémentation conformes R10 pour le Lot 02c — Refontes et Optimisations

---

## Objectif

Ce lot vise à optimiser l'architecture de l'application sur quatre aspects majeurs :
1. **Indexation O(1)** de l'état des personnages pour éviter les parcours linéaires répétitifs.
2. **Promisification des dialogues** pour éradiquer le callback hell des modales d'action.
3. **Imports statiques Firebase** via npm pour supprimer les imports CDN dynamiques.
4. **Rendus DOM ciblés** pour éviter les re-rendus globaux et destructifs du DOM.

Il comprend également la résolution des **3 bugs historiques** identifiés au cours du Lot 02b.

---

## Installation des Dépendances (npm)

Avant de commencer le refactoring, tu dois ajouter le package officiel Firebase à la configuration de build locale :
```bash
npm install firebase --save
```

---

## Dépendances à mocker dans les Tests (R10-Exigence 3)

Le fichier de tests unitaires `tests/combat.test.js` doit continuer de s'exécuter avec succès après ces modifications. Les imports statiques de `src/modules/combat.js` restent identiques mais leur implémentation interne est assainie. Assure-toi de mettre à jour les mocks dans `tests/combat.test.js` si le comportement de l'un de ces modules change :
* **`../src/modules/state.js`** : Contient l'état et l'indexation. Mocker `state`, `setState`, `getChar`, `cardTypes` et `pushHistory`.
* **`../src/modules/firebase.js`** : Mocker les exports statiques (`save`, `set`, `get`, `remove`, `ref`, `firebaseDB`) pour intercepter toute interaction avec Firebase.

---

## Contrat par fonction modifiée/ajoutée (R10-Exigence 2)

| Fonction | Entrées réelles (params ET/OU IDs DOM lus) | Effets de bord (window.*, imports) | Mutation state | fichier:ligne |
|---|---|---|---|---|
| `setState` | Paramètre: `v` (state object) | Appelle `rebuildCharsMap()` pour rafraîchir l'indexation | Modifie: `state` (réassigne la variable locale) | `src/modules/state.js:16` |
| `getChar` | Paramètre: `id` (number) | Aucun (recherche instantanée $O(1)$) | Aucun | `src/modules/state.js:16 [NEW]` |
| `initFirebase` | Aucun | Importe statiquement Firebase SDK (remplace CDN)<br>Modifie DOM: `#firebase-status` | Aucun | `src/modules/firebase.js:25` |
| `syncToFirebase` | State: `state` | Importe statiquement Firebase SDK (remplace CDN) | Modifie: `state._ts` (horodatage) | `src/modules/firebase.js:60` |
| `showActionConfirm` | Paramètre: `icon` (string)<br>Paramètre: `title` (string)<br>Paramètre: `desc` (string)<br>Paramètre optionnel: `onConfirm` (callback) | Écritures DOM: injecte les textes dans `#action-confirm-*` et affiche l'overlay. Retourne une `Promise` résolvant vers `true`/`false`. | Aucun | `src/modules/ui/modals.js:6` |
| `closeActionConfirm` | Aucun | Écritures DOM: cache l'overlay et résout la promesse pendante à `false` | Aucun | `src/modules/ui/modals.js:13` |
| `endRound` | State: `state.round`, `state.chars` | `await window.showActionConfirm()` (Promise)<br>Appels UI: `save()`, `window.render()`, `window.showUndoBar()` | Modifie: `state.round`, `c.etat` (si equal à `Surpris`) | `src/modules/combat.js:132` |
| `endCombat` | State: `state.combat`, `state.round`, `state.activeTurn`, `state.chars` | `await window.showActionConfirm()` (Promise)<br>Appels UI: `save()`, `window.render()`, `window.showUndoBar()` | Modifie: `state.combat`, `state.round`, `state.activeTurn`, `c.etat` (si `Étourdi` ou `Surpris`) | `src/modules/combat.js:140` |
| `endSession` | State: `state.session`, `state.combat`, `state.round`, `state.activeTurn` | `await window.showActionConfirm()` (Promise)<br>Appels UI: `save()`, `window.render()`, `window.showUndoBar()` | Modifie: `state.session`, `state.combat`, `state.round`, `state.activeTurn` | `src/modules/combat.js:148` |
| `resetAll` | State: `state` (réinitialisé) | `await window.showActionConfirm()` (Promise)<br>Appels UI: `save()`, `window.render()`, `window.toast()` | Appelle `setState` avec les valeurs par défaut et réinitialise l'historique | `src/modules/combat.js:155` |
| `reposComplet` | Aucun | `await window.showActionConfirm()` (Promise)<br>Appels UI: `confirmReposComplet()`, `window.showUndoBar()` | Aucun directement | `src/modules/combat.js:161` |
| `render` | State: `state.chars` | Vérifie les IDs dans le DOM `#char-grid` pour décider s'il faut régénérer `innerHTML` ou appliquer `updateCardDOM(c)` de manière ciblée. | Appelle `initHistory()` | `src/modules/ui/render.js:6` |
| `forceRefresh` | DOM: `#refresh-btn` (bouton)<br>State: `state` | Appels UI: `setState()`, `toast()` (utilise les imports Firebase locaux au lieu du CDN) | Modifie: `state` | `src/main.js:34` |
| `importCOFRules` | DOM: `#cof-rules-status` | Utilise les fonctions `set`, `ref` importées statiquement depuis `../firebase.js` (supprime les imports CDN dynamiques) | Aucun | `src/modules/assistant/cof-import.js:15` |

---

## Instructions détaillées par composant (R10-Exigence 1)

### 1. Refonte de l'État : Indexation O(1)
* **Indexation** : Crée une Map locale privée `let charsMap = new Map();` dans [state.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/state.js).
* **Mise à jour** : Dès que `setState(v)` (`src/modules/state.js:16`) est appelée, reconstruits la Map en bouclant sur `v.chars` et en insérant chaque personnage sous la clé `c.id`.
* **Accesseur** : Exporte une fonction `getChar(id)` (`src/modules/state.js:16 [NEW]`) retournant `charsMap.get(id)`.
* **Refactoring des modules** : Remplace les parcours linéaires de recherche `state.chars.find(x => x.id === id)` par `getChar(id)` dans :
  - [combat.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/combat.js) (ex: `applyDmg` ligne 43, `applyHeal` ligne 64, `adjPM` ligne 83, `recupPM` ligne 92, `adjPC` ligne 100, `setActiveTurn` ligne 180).
  - [state.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/state.js) (ex: `undoChar` ligne 44, `redoChar` ligne 57).
  - [ui/render.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/ui/render.js) (ex: `cardHTML` ligne 85).
* **Sécurité** : Conserve le tableau `state.chars` intact (les itérations collectives `.map`, `.filter`, `.forEach` doivent continuer d'utiliser le tableau natif pour limiter le risque de régression).

### 2. Promisification des dialogues de confirmation
* **Promise modale** : Modifie `showActionConfirm` (`src/modules/ui/modals.js:6`) pour retourner une `Promise` :
  - Le clic sur `#action-confirm-ok` ferme la modale et résout la promesse à `true`.
  - La fermeture par le bouton d'annulation (`closeActionConfirm`, `src/modules/ui/modals.js:13`) résout la promesse à `false`.
  - Assure la compatibilité avec le code legacy : si le quatrième paramètre `onConfirm` est fourni, exécute-le comme avant au clic sur OK (pas de Promise nécessaire dans ce cas).
* **Refactoring syntaxique** : Convertis les appelants de `showActionConfirm` dans [combat.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/combat.js) (`endRound` ligne 132, `endCombat` ligne 140, `endSession` ligne 148, `resetAll` ligne 155, `reposComplet` ligne 161) et [roster.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/roster.js) (lignes 74, 93, 187) pour utiliser la structure :
  ```javascript
  if (await window.showActionConfirm('...', '...', '...')) {
    // logique de confirmation
  }
  ```
  Déclare ces fonctions comme `async`.

### 3. Suppression définitive des Imports CDN Firebase
* **firebase.js** : Remplace tous les imports CDN dynamiques de [firebase.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/firebase.js) (lignes 27-28 et 65) par des imports statiques du package local en tête de fichier :
  ```javascript
  import { initializeApp } from 'firebase/app';
  import { getDatabase, ref, onValue, set, get, remove } from 'firebase/database';
  ```
* **Exports d'abstraction** : Exporte les fonctions `set`, `get`, `remove`, et `ref` depuis `firebase.js` pour éviter que les autres modules fassent leurs propres imports.
* **Assistant Rules crawler** : Dans [cof-import.js](file:///c:/Users/keife/.gemini/antigravity/scratch/Tracker/src/modules/assistant/cof-import.js), supprime les imports dynamiques (lignes 124, 235, 248, 260, 279) et importe-les statiquement depuis `../firebase.js` :
  ```javascript
  import { firebaseDB, firebaseApp, _fbConnected, set, get, remove, ref } from '../firebase.js';
  ```
* **Main.js** : Modifie `forceRefresh` (`src/main.js:43`) pour utiliser `get` et `ref` importés statiquement depuis `./modules/firebase.js`.

### 4. Rendu de carte ciblé (Optimisation de re-rendu)
* **Algorithme de render** : Modifie la fonction `render` (`src/modules/ui/render.js:6`) :
  - Récupère la liste des personnages présents à afficher.
  - Vérifie si le conteneur `#char-grid` possède déjà des enfants correspondant exactement à ces personnages (comparaison de la liste ordonnée des IDs présents avec les IDs des éléments DOM `.card` du conteneur).
  - **Cas A (Changement structurel)** : Si la liste des IDs a changé (présence modifiée, personnage ajouté/supprimé, ou premier affichage), reconstruis la grille en réassignant `innerHTML` (comportement d'origine).
  - **Cas B (Mise à jour d'état)** : Si la liste des IDs est identique, ne vide pas `innerHTML`. Boucle sur chaque personnage et appelle une fonction ciblée de mise à jour `updateCardDOM(c)` qui va modifier uniquement les propriétés DOM spécifiques (valeur de PV, PM, PC, classe active-turn, selecteur d'état, boutons d'historique).
* Cette optimisation empêchera la perte de focus de l'utilisateur sur les inputs de combat et éliminera les sauts graphiques.

### 5. Résolution des 3 bugs historiques
* **Bug 1 (combat.js:44)** : Ajoute une garde sur la présence de l'élément `#dmg-${id}` et `#src-${id}` pour éviter un crash `TypeError` si la fonction `applyDmg` est appelée alors que le personnage correspondant n'est pas ou plus rendu dans le DOM.
* **Bug 2 (combat.js:52)** : Remplace l'identifiant de log `Date.now() + Math.random()` par une formule garantissant l'unicité (ex: `crypto.randomUUID()` ou un compteur incrémental unique ou combiné avec `Date.now()`).
* **Bug 3 (combat.js:117)** : Ajoute une valeur par défaut à `c.niveau` (`c.niveau || 1`) pour éviter que `roll + conMod + c.niveau` propage un `NaN` et corrompe le PV du personnage lors de l'application d'un point de récupération.

---

## Validation

1. Assure-toi que `npm run build` et `npm run lint` ne renvoient aucune erreur.
2. Exécute la suite de tests unitaires via `npm test`. Tous les tests (y compris les tests unitaires de combat) doivent rester au vert.
3. Vérifie au navigateur que la saisie dans les champs "DM" ou "Soin" n'est plus perdue ou interrompue par les rafraîchissements réseau de Firebase.
