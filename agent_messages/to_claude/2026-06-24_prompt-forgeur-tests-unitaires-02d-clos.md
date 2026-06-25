# ✉️ Consignes de l'Architecte — Implémentation du Lot 02d (Tests Unitaires)

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-24 14:56:00  
**Sujet :** Instructions d'implémentation du Lot 02d — Tests unitaires restants (dés, stockage, état)

---

## Objectif

Ce lot vise à fournir une suite de tests unitaires complète pour les trois modules n'ayant pas encore de couverture dédiée : `state.js`, `storage.js` et `dice.js`. L'environnement de test est Vitest avec l'environnement `happy-dom`.

---

## Contrats des fonctions à tester (R10-Exigence 2)

### 1. Module `src/modules/state.js`
| Fonction | Entrées réelles (params ET/OU IDs DOM lus) | Effets de bord (window.*, imports) | Mutation state | fichier:ligne |
|---|---|---|---|---|
| `rebuildCharsMap` | Lit `state.chars` | Aucun | Modifie la Map interne privée `charsMap` | `src/modules/state.js:19` |
| `getChar` | Paramètre: `id` (number) | Aucun (recherche instantanée $O(1)$) | Aucun | `src/modules/state.js:25` |
| `setState` | Paramètre: `v` (state object) | Appelle `rebuildCharsMap()` | Modifie `state` (réassigne) | `src/modules/state.js:30` |
| `initHistory` | Lit `state.chars` | Aucun | Initialise `charHistory` | `src/modules/state.js:51` |
| `pushHistory` | Paramètres: `charId`, `pvActuel`, `etat`, `logEntry` | Aucun | Ajoute un snapshot dans `charHistory[charId]` | `src/modules/state.js:56` |
| `undoChar` | Paramètre: `id` | Appelle `save()`, `window.render()`, `window.toast()`, et conditionnellement `window.renderLog()`, `window.renderRecap()` | Décale le pointeur d'historique, modifie `c.pvActuel`/`c.etat` et retire l'entrée de log dans `state.log` | `src/modules/state.js:63` |
| `redoChar` | Paramètre: `id` | Appelle `save()`, `window.render()`, `window.toast()`, et conditionnellement `window.renderLog()`, `window.renderRecap()` | Décale le pointeur d'historique, modifie `c.pvActuel`/`c.etat` et rajoute l'entrée de log dans `state.log` | `src/modules/state.js:76` |

### 2. Module `src/modules/storage.js`
| Fonction | Entrées réelles (params ET/OU IDs DOM lus) | Effets de bord (window.*, imports) | Mutation state | fichier:ligne |
|---|---|---|---|---|
| `loadState` | `localStorage` (`anathazer_v4` ou `anathazer_v3`) | Lit `DEFAULT_CHARS`, `ETATS_DEFAULT` | Aucun (retourne l'état chargé) | `src/modules/storage.js:8` |
| `loadSettings` | `localStorage` (`anathazer_settings`) | Aucun | Fusionne dans le mutable `settings` | `src/modules/storage.js:37` |
| `saveSettings` | DOM: `#tog-pm`, `#tog-pc` | Écrit `localStorage`, appelle `window.render()` | Modifie `settings.showPM`, `settings.showPC` | `src/modules/storage.js:40` |
| `applyTheme` | Paramètre: `id` (string) | Écrit `localStorage`, modifie `document.documentElement` (`data-theme`), appelle `window.renderThemeGrid()` | Modifie `settings.theme` | `src/modules/storage.js:46` |
| `getCharPwds` | `localStorage` (`anathazer_char_pwds`) | Aucun | Aucun | `src/modules/storage.js:54` |
| `setCharPwds` | Paramètre: `p` (object) | Écrit `localStorage` | Aucun | `src/modules/storage.js:55` |
| `getPmAttrPref` | Paramètre: `charId` | Lit `localStorage` (`anathazer_pm_pref`) | Aucun | `src/modules/storage.js:58` |
| `setPmAttrPref` | Paramètre: `charId`, `attr` | Écrit `localStorage` | Aucun | `src/modules/storage.js:61` |

### 3. Module `src/modules/dice.js`
| Fonction | Entrées réelles (params ET/OU IDs DOM lus) | Effets de bord (window.*, imports) | Mutation state | fichier:ligne |
|---|---|---|---|---|
| `dieSVG` | Paramètre: `sides` (number) | Aucun | Aucun | `src/modules/dice.js:8` |
| `initDiceSVG` | DOM: `#dice-svg-row` | Injecte le HTML des SVG dans le DOM | Aucun | `src/modules/dice.js:21` |
| `selectDie` | Paramètre: `d` (number) | Modifie la classe `.die-wrap` dans le DOM | Modifie `activeDie` | `src/modules/dice.js:29` |
| `rollDice` | DOM: `#dice-n`, `#dice-mod`, `.roll-result`, `#rr-formula`, `#rr-dice`, `#rr-total`, `#rr-label`, `#dice-history-list` | Met à jour le DOM, appelle `updateDiceStats()` | Insère le jet dans `diceHistory` (plafonné à 100) | `src/modules/dice.js:34` |
| `updateDiceStats` | DOM: `#dice-stats`, `#ds-grid`, `#ds-dist` | Met à jour le DOM | Aucun | `src/modules/dice.js:70` |

---

## Dépendances à mocker dans les Tests (R10-Exigence 3)

### Pour `tests/state.test.js`
* **`../src/modules/firebase.js`** : Mocker `save` pour intercepter la persistance Firebase.
* **UI Globals** : Bouchonner `window.render`, `window.toast`, `window.renderLog` et `window.renderRecap` via `vi.stubGlobal`.

### Pour `tests/storage.test.js`
* **`../src/modules/constants.js`** : Importer ou mocker `DEFAULT_CHARS` et `ETATS_DEFAULT` pour vérifier la fusion.
* **UI Globals** : Bouchonner `window.render` et `window.renderThemeGrid` via `vi.stubGlobal`.
* **LocalStorage** : Utiliser un mock propre en mémoire pour `window.localStorage` afin d'éviter d'altérer le vrai stockage du navigateur pendant la suite de tests.

### Pour `tests/dice.test.js`
* **`../src/modules/constants.js`** : Mocker ou réutiliser `DICE_TYPES`.
* **UI Globals** : Bouchonner `window.render` ou d'autres hooks UI si nécessaire.
* **Math.random** : Bouchonner `Math.random` via un espion (`vi.spyOn(Math, 'random')`) pour obtenir des lancers de dés déterministes.

---

## Instructions d'implémentation détaillées (R10-Exigence 1)

### 1. Fichier de tests pour l'État : `tests/state.test.js`
* Tester l'indexation $O(1)$ : vérifier que `getChar` utilise bien la Map, et qu'il effectue un fallback linéaire résilient vers le tableau `state.chars` si la clé est absente de la Map.
* Tester les setters mutables et s'assurer que `setState` corrige la présence de `state.log` si Firebase a renvoyé un objet sans clé `log`.
* Tester le cycle de vie de l'historique par carte (`initHistory`, `pushHistory`) en vérifiant la manipulation correcte de la pile locale.
* Tester `undoChar` et `redoChar` : vérifier le recul/l'avance du pointeur, l'application du snapshot sur le personnage, la filtration/l'ajout d'entrées correspondantes dans le tableau de logs, et les appels aux fonctions de rendu.

### 2. Fichier de tests pour le Stockage : `tests/storage.test.js`
* Tester la résilience de `loadState` :
  * Charger un JSON nominal depuis `anathazer_v4`.
  * Valider la migration depuis `anathazer_v3`.
  * Simuler un JSON corrompu et s'assurer du retour sécurisé de l'état par défaut (DEFAULT_CHARS).
  * Valider la fusion des champs par défaut (`voies`, `armes`, `raciales` et `resume` manquants) et la migration de `att` vers les trois propriétés d'attaque.
* Tester `loadSettings` et `saveSettings` : vérifier la lecture du DOM (checkboxes `#tog-pm` et `#tog-pc`) et l'écriture dans `anathazer_settings`.
* Tester `applyTheme` : s'assurer du bon positionnement de l'attribut `data-theme` sur l'élément racine du document (`document.documentElement`).

### 3. Fichier de tests pour les Dés : `tests/dice.test.js`
* Tester que `dieSVG(sides)` retourne bien le markup SVG contenant les classes/balises attendues pour chaque type de dé (d4, d6, d8, d10, d12, d20, d100).
* Tester l'initialisation du panneau de dés (`initDiceSVG`) et la sélection active (`selectDie`).
* Tester la fonction `rollDice()` :
  * Injecter des fixtures DOM pour simuler le panneau (les inputs de nombre `#dice-n` et de modificateur `#dice-mod`, et les conteneurs de résultats).
  * Avec `Math.random` stubbé, tester des tirages multiples et vérifier le calcul final correct.
  * Valider le marquage des critiques (`isCrit` et `isFumble`) pour un lancer de d20 (1 seul dé).
  * Valider le plafonnement de `diceHistory` à 100 éléments.
  * Vérifier que `updateDiceStats()` calcule la bonne moyenne, les valeurs extrêmes et la distribution correcte sous forme de buckets (uniquement pour les tirages de d20).
  * Tester que l'écouteur `keydown` sur Enter déclenche bien `rollDice` lorsque l'onglet dés est actif.
