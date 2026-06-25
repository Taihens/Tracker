# ✉️ Consignes de Forgeron — Refactoring Lot 02b (Tests Combat)

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-23 18:43:00  
**Sujet :** Instructions d'implémentation conformes R10 pour le Lot 02b — Tests de caractérisation (Combat)

---

## Objectif

Mettre en place une suite complète de tests unitaires pour le module `src/modules/combat.js` afin de caractériser son comportement actuel et de servir de filet de sécurité avant les optimisations de l'état et du rendu (Lot 02c).

## Fichier de Test à Créer

* **Chemin** : `tests/combat.test.js`
* **Technologie** : Vitest (exécuté via `npm test`)
* **Environnement** : `happy-dom` (déjà configuré dans `vitest.config.js`)

---

## Dépendances à mocker (R10-Exigence 3)

Pour garantir l'isolation des tests unitaires, tu dois mocker les imports statiques du module `src/modules/combat.js` avec les chemins relatifs exacts par rapport au fichier de test `tests/combat.test.js` :

* **`../src/modules/state.js`** : Mocker pour contrôler l'état virtuel en mémoire. Les exports à mocker sont : `state`, `setState`, `cardTypes`, `setCharHistory` et `pushHistory`.
* **`../src/modules/firebase.js`** : Mocker l'export `save` (ex: `vi.mock('../src/modules/firebase.js', () => ({ save: vi.fn() }))`) pour bloquer les appels réseau vers Firebase.
* **`../src/modules/cof-classes.js`** : Mocker ou importer en réel (les helpers de calculs purs `parseMod` et `dvMax` peuvent être importés en réel ou mockés au besoin).
* **`../src/modules/constants.js`** : Mocker ou importer en réel (contient `DEFAULT_CHARS` et `ETATS_DEFAULT`).

---

## Contrats par fonction (R10-Exigence 2)

| Fonction | Entrées réelles (params ET/OU IDs DOM lus) | Effets de bord (window.*, imports) | Mutation state | fichier:ligne |
|---|---|---|---|---|
| `hpClass` | Paramètre: `c` (character object) | Aucun | Aucun | `src/modules/combat.js:11` |
| `hpColor` | Paramètre: `c` (character object) | Aucun | Aucun | `src/modules/combat.js:15` |
| `setDmgType` | Paramètre: `id` (number)<br>Paramètre: `type` (string)<br>DOM: `#tp-[id]` (bouton)<br>DOM: `#tm-[id]` (bouton) | Écritures DOM: modifie `className` de `#tp-[id]` et `#tm-[id]` | Modifie: `cardTypes[id]` | `src/modules/combat.js:21` |
| `setEtat` | Paramètre: `id` (number)<br>Paramètre: `val` (string)<br>State: `state.chars` | Appels UI: `save()`, `window.render()`, `window.toast()` si `val !== 'Normal'`, `window.checkDeath()` | Modifie: `c.etat` | `src/modules/combat.js:27` |
| `updateCardPV` | Paramètre: `c` (character object)<br>DOM: `#card-[c.id]` (div)<br>DOM: `.hp-cur` (sous `#card-[c.id]`)<br>DOM: `.bar-fill` (sous `#card-[c.id]`) | Écritures DOM: met à jour le texte et les classes de `.hp-cur`, le style (`width`, `background`) de `.bar-fill`, et ajoute/retire la classe `ko` de `#card-[c.id]` | Aucun | `src/modules/combat.js:33` |
| `applyDmg` | Paramètre: `id` (number)<br>DOM: `#dmg-[id]` (input, value)<br>DOM: `#src-[id]` (input, value)<br>DOM: `#g-cname` (input, value)<br>DOM: `#tab-log` (onglet, class)<br>DOM: `#tab-recap` (onglet, class)<br>State: `state.chars`, `state.session`, `state.combat`, `state.round` | Appels UI: `updateCardPV()`, `pushHistory()`, `save()`, `window.render()`, `window.renderLog()`, `window.renderRecap()`, `window.toast()`, `window.checkDeath()` <br> Écritures DOM: `#dmg-[id].value = ''`, `#src-[id].value = ''` | Modifie: `c.pvActuel`, `c.etat`<br>Ajoute: entrée dans `state.log` | `src/modules/combat.js:42` |
| `applyHeal` | Paramètre: `id` (number)<br>DOM: `#heal-[id]` (input, value)<br>DOM: `#hsrc-[id]` (input, value)<br>DOM: `#g-cname` (input, value)<br>DOM: `#tab-log` (onglet, class)<br>DOM: `#tab-recap` (onglet, class)<br>State: `state.chars`, `state.session`, `state.combat`, `state.round` | Appels UI: `updateCardPV()`, `pushHistory()`, `save()`, `window.render()`, `window.renderLog()`, `window.renderRecap()`, `window.toast()` <br> Écritures DOM: `#heal-[id].value = ''`, `#hsrc-[id].value = ''` | Modifie: `c.pvActuel`, `c.etat`<br>Ajoute: entrée dans `state.log` | `src/modules/combat.js:63` |
| `adjPM` | Paramètre: `id` (number)<br>Paramètre: `d` (number)<br>State: `state.chars`, `state.session`, `state.combat`, `state.round` | Appels UI: `save()`, `window.render()`, `window.toast()` | Modifie: `c.pmActuel`<br>Ajoute: entrée dans `state.log` | `src/modules/combat.js:82` |
| `recupPM` | Paramètre: `id` (number)<br>State: `state.chars`, `state.session`, `state.combat`, `state.round` | Appels UI: `save()`, `window.render()`, `window.toast()` | Modifie: `c.pmActuel`<br>Ajoute: entrée dans `state.log` | `src/modules/combat.js:91` |
| `adjPC` | Paramètre: `id` (number)<br>Paramètre: `d` (number)<br>State: `state.chars`, `state.session`, `state.combat`, `state.round` | Appels UI: `save()`, `window.render()`, `window.toast()` | Modifie: `c.pcActuel`<br>Ajoute: entrée dans `state.log` | `src/modules/combat.js:99` |
| `adjRound` | Paramètre: `d` (number)<br>State: `state.round` | Appels UI: `save()`, `window.render()` | Modifie: `state.round` | `src/modules/combat.js:108` |
| `pointRecup` | State: `state.chars`, `state.session`, `state.combat`, `state.round`<br>DOM: `#g-cname` (input, optionnel)<br>DOM: `#card-[c.id]` (div) | Appels UI: `pushHistory()`, `save()`, `window.render()`, `window.toast()` <br> Écritures DOM: ajoute/retire la classe `healing` sur `#card-[c.id]` après un `setTimeout` de 900ms | Modifie: `c.pvActuel` (personnages présents, vivants et blessés)<br>Ajoute: entrée dans `state.log` | `src/modules/combat.js:111` |
| `endRound` | State: `state.round`, `state.chars` | Appels UI: `window.showActionConfirm()`, `window.saveSnapshot()`, `save()`, `window.render()`, `window.showUndoBar()` | Modifie: `state.round`, `c.etat` (si égal à `Surpris`) | `src/modules/combat.js:132` |
| `endCombat` | State: `state.combat`, `state.round`, `state.activeTurn`, `state.chars` | Appels UI: `window.showActionConfirm()`, `window.saveSnapshot()`, `save()`, `window.render()`, `window.showUndoBar()` | Modifie: `state.combat`, `state.round`, `state.activeTurn`, `c.etat` (si `Étourdi` ou `Surpris`) | `src/modules/combat.js:140` |
| `endSession` | State: `state.session`, `state.combat`, `state.round`, `state.activeTurn` | Appels UI: `window.showActionConfirm()`, `window.saveSnapshot()`, `save()`, `window.render()`, `window.showUndoBar()` | Modifie: `state.session`, `state.combat`, `state.round`, `state.activeTurn` | `src/modules/combat.js:148` |
| `resetAll` | State: `state` (réinitialisé) | Appels UI: `window.showActionConfirm()`, `save()`, `window.render()`, `window.toast()` | Appelle `setState` avec défauts, et `setCharHistory({})` | `src/modules/combat.js:155` |
| `reposComplet` | Aucun | Appels UI: `window.showActionConfirm()`, `window.saveSnapshot()`, `confirmReposComplet()`, `window.showUndoBar()` | Aucun directement | `src/modules/combat.js:161` |
| `confirmReposComplet` | State: `state.chars`<br>DOM: `#card-[c.id]` (div) | Appels UI: `save()`, `window.render()`, `window.toast()` <br> Écritures DOM: ajoute/retire la classe `healing` sur `#card-[c.id]` après un `setTimeout` de 900ms | Modifie: `c.pvActuel`, `c.pmActuel`, `c.pcActuel`, `c.etat` pour tous. Appelle `setCharHistory({})` | `src/modules/combat.js:168` |
| `setActiveTurn` | Paramètre: `id` (number)<br>State: `state.activeTurn`, `state.chars` | Appels UI: `save()`, `window.render()`, `window.toast()` si actif | Modifie: `state.activeTurn` | `src/modules/combat.js:177` |

---

## Comportements critiques à caractériser (R10-Exigence 1)

Tu dois installer les fixtures dans le DOM virtuel Happy DOM avant l'exécution de chaque test pour simuler correctement les lectures et écritures DOM :

### 1. HP Classes & Colors (`hpClass` / `hpColor`)
* **dead** : Retourne `'dead'` / `'#555'` si `c.pvActuel <= 0` (`src/modules/combat.js:13,17`).
* **crit** : Retourne `'crit'` / `'#e04444'` si le ratio de PV est $< 0.25$ (`src/modules/combat.js:13,17`).
* **low** : Retourne `'low'` / `'#ff9800'` si le ratio de PV est $< 0.5$ (`src/modules/combat.js:13,17`).
* **ok** : Retourne `'ok'` / `'#8bc34a'` si le ratio de PV est $< 1.0$ (`src/modules/combat.js:13,17`).
* **full** : Retourne `'full'` / `'#4a9a40'` si le ratio est $\ge 1.0$ (ou si `pvActuel === pvMax`) (`src/modules/combat.js:13,17`).

### 2. Type de Dégâts (`setDmgType`)
* **Calculs & Mutation** : Mutate `cardTypes[id]` avec la valeur fournie (`src/modules/combat.js:22`).
* **DOM** : Recherche `#tp-[id]` et `#tm-[id]` (`src/modules/combat.js:23`) et met à jour leurs classes :
  * Si type physique : `#tp-[id]` reçoit `'btn-type t-phys'`, `#tm-[id]` reçoit `'btn-type'` (`src/modules/combat.js:24-25`).
  * Si type magique : `#tp-[id]` reçoit `'btn-type'`, `#tm-[id]` reçoit `'btn-type t-mag'` (`src/modules/combat.js:24-25`).

### 3. Changement d'État Manuel (`setEtat`)
* **Mutation** : Assigne `c.etat = val` (`src/modules/combat.js:29`).
* **Rendu** : Appelle `save()` et `window.render()` (`src/modules/combat.js:29`).
* **Toast** : Affiche un toast informatif via `window.toast` si le nouvel état est différent de `'Normal'` (`src/modules/combat.js:30`).
* **Death Check** : Appelle `window.checkDeath(c)` (`src/modules/combat.js:31`).

### 4. Rendu de la Carte PV (`updateCardPV`)
* **Écritures DOM** :
  * Met à jour `.hp-cur` avec le texte du PV actuel et applique la classe CSS obtenue via `hpClass(c)` (`src/modules/combat.js:37`).
  * Met à jour la largeur de `.bar-fill` en pourcentage (bornée à un minimum de `0%`) et son fond via `hpColor(c)` (`src/modules/combat.js:39`).
  * Ajoute la classe `'ko'` au conteneur `#card-[c.id]` si `pvActuel <= 0`, sinon la retire (`src/modules/combat.js:40`).

### 5. Dégâts (`applyDmg`)
* **Calculs nominaux** : Déduction des PV actuels selon le montant entier lu dans l'input DOM `#dmg-[id]` (`src/modules/combat.js:44`, soustrait à `src/modules/combat.js:49`). Le résultat est borné à 0 minimum via `Math.max(0, ...)` (`src/modules/combat.js:49`).
* **Valeurs négatives ou nulles** : Si le montant lu est $\le 0$, la fonction effectue un retour précoce sans modifier les PV ni insérer de log (`src/modules/combat.js:45`), et affiche un toast `'Valeur invalide'` avec la classe `'t-w'` (`src/modules/combat.js:45`).
* **Inconscience** : Si les PV restants tombent à 0, l'état devient automatiquement `'Inconscient'` (`src/modules/combat.js:51`), affiche un toast d'inconscience `☠ [Nom] est Inconscient !` et appelle `window.checkDeath(c)` (`src/modules/combat.js:61`).
* **Hors scope** : Le statut `'Mort'` n'est pas géré directement par la modification de PV (il est géré par `window.checkDeath(c)`). Ne pas tester de transition automatique vers `'Mort'` dans la logique pure de dégâts.
* **Historique et Logs** : Insère un log dans `state.log` avec le type de dégâts lu dans `cardTypes[id]` (par défaut `'Physique'`, `src/modules/combat.js:47`) et la source du dégât lue depuis `#src-[id]` (ou `'—'`, `src/modules/combat.js:46`). Appelle ensuite `pushHistory(...)` (`src/modules/combat.js:54`).
* **Nettoyage DOM** : Vide les champs `#dmg-[id]` et `#src-[id]` (`src/modules/combat.js:55-56`).
* **Intégration d'onglet** : Rafraîchit les onglets via `window.renderLog()` / `window.renderRecap()` si les éléments `#tab-log` ou `#tab-recap` ont respectivement la classe `'active'` (`src/modules/combat.js:58-59`).

### 6. Soins (`applyHeal`)
* **Calculs nominaux** : Ajout de PV actuels selon la valeur lue dans `#heal-[id]` (`src/modules/combat.js:65`, additionné à `src/modules/combat.js:69`). Le résultat est borné supérieurement à `pvMax` via `Math.min(c.pvMax, ...)` (`src/modules/combat.js:69`).
* **Valeurs négatives ou nulles** : Si le montant lu est $\le 0$, retour précoce sans effet (`src/modules/combat.js:66`), et affiche le toast `'Valeur invalide'` (`src/modules/combat.js:66`).
* **Réveil** : Si le personnage avait l'état `'Inconscient'` et que son PV final est $> 0$, son état repasse automatiquement à `'Normal'` (`src/modules/combat.js:71`).
* **Nettoyage DOM** : Vide les champs `#heal-[id]` et `#hsrc-[id]` (`src/modules/combat.js:75-76`).

### 7. PM & PC (`adjPM` / `recupPM` / `adjPC`)
* **PM Bornage** : Modifie `c.pmActuel` par `d` (`src/modules/combat.js:85`) en le bornant entre `0` et `c.pmMax`. Si la valeur ne change pas, retourne immédiatement sans effet (`src/modules/combat.js:86`).
* **PM Log & Toast** : Insère une entrée de log `'PM dépensé'` (si `d < 0`) ou `'PM récupéré'` (si `d > 0`) dans `state.log` (`src/modules/combat.js:87`) et affiche un toast informatif (`src/modules/combat.js:89`).
* **PC Bornage** : Modifie `c.pcActuel` par `d` (`src/modules/combat.js:102`) en le bornant entre `0` et `c.pcMax`. Si la valeur ne change pas, retourne immédiatement sans effet (`src/modules/combat.js:103`).
* **PC Log & Toast** : Insère une entrée `'PC dépensé'` / `'PC récupéré'` (`src/modules/combat.js:104`) et affiche un toast (`src/modules/combat.js:106`).
* **Récupération PM complète** : `recupPM` restaure `pmActuel = pmMax` (`src/modules/combat.js:94`). Fait un retour précoce sans effet si le gain calculé est $\le 0$ (`src/modules/combat.js:93`).

### 8. Point de Récupération (`pointRecup`)
* **Filtre** : Ne traite que les personnages présents, vivants (PV > 0) et blessés (PV < PV Max) (`src/modules/combat.js:112`).
* **Calcul COF** : Le gain vaut `roll + conMod + c.niveau` (minimum `1`) (`src/modules/combat.js:117`). Le `roll` simule un dé de taille maximale définie par `c.dv` (ou `'D6'` par défaut, `src/modules/combat.js:114-116`). `conMod` provient de `parseMod(c.attrs?.CON || 0)` (`src/modules/combat.js:113`).
* **Effets** : Mutate `pvActuel` (max `pvMax`, `src/modules/combat.js:119`), pousse un log `'Soin'` (`src/modules/combat.js:122-123`), sauvegarde et affiche un toast global (`src/modules/combat.js:126,128`).
* **Animation** : Ajoute temporairement la classe `'healing'` sur le conteneur DOM `#card-[c.id]` et la retire après 900ms (`src/modules/combat.js:127`).

### 9. Transitions de Combat et Confirmations (`endRound` / `endCombat` / `endSession`)
* **Confirmation requise** : Chacune de ces fonctions appelle `window.showActionConfirm(icone, titre, message, callback)` (`src/modules/combat.js:133,141,149`).
* **Callback de Fin de Round** :
  * Appelle `window.saveSnapshot()` (`src/modules/combat.js:134`).
  * Incrémente `state.round` de 1 (`src/modules/combat.js:135`).
  * Efface l'état `'Surpris'` (repasser à `'Normal'`) de tous les personnages (`src/modules/combat.js:136`).
  * Appelle `save()`, `window.render()` et `window.showUndoBar(...)` (`src/modules/combat.js:137`).
* **Callback de Fin de Combat** :
  * Appelle `window.saveSnapshot()` (`src/modules/combat.js:142`).
  * Incrémente `state.combat` de 1, remet `state.round` à 1, remet `state.activeTurn` à `null` (`src/modules/combat.js:143`).
  * Efface les états `'Étourdi'` et `'Surpris'` (repasser à `'Normal'`) de tous les personnages (`src/modules/combat.js:144`).
  * Appelle `save()`, `window.render()` et `window.showUndoBar(...)` (`src/modules/combat.js:145`).
* **Callback de Fin de Session** :
  * Appelle `window.saveSnapshot()` (`src/modules/combat.js:150`).
  * Incrémente `state.session` de 1, remet `state.combat` à 1, `state.round` à 1, `state.activeTurn` à `null` (`src/modules/combat.js:151`).
  * Appelle `save()`, `window.render()` et `window.showUndoBar(...)` (`src/modules/combat.js:152`).

### 10. Réinitialisation et Repos (`resetAll` / `reposComplet` / `confirmReposComplet`)
* **resetAll** : Ouvre un dialogue de confirmation (`src/modules/combat.js:156`). Le callback réinitialise complètement l'état via `setState` avec les valeurs par défaut (`DEFAULT_CHARS`, `ETATS_DEFAULT`, etc., `src/modules/combat.js:157`), réinitialise l'historique via `setCharHistory({})` (`src/modules/combat.js:158`), sauvegarde et rafraîchit l'UI.
* **reposComplet** : Ouvre un dialogue de confirmation (`src/modules/combat.js:162`). Le callback appelle `window.saveSnapshot()`, puis `confirmReposComplet()` et `window.showUndoBar()` (`src/modules/combat.js:163-165`).
* **confirmReposComplet** : Restaure les PV, PM et PC au maximum, et l'état à `'Normal'` pour tous les personnages (`src/modules/combat.js:169`). Efface l'historique via `setCharHistory({})` (`src/modules/combat.js:170`), sauvegarde, rafraîchit, affiche un toast et applique l'effet visuel `'healing'` temporaire sur le DOM (#card-[c.id]) des personnages présents (`src/modules/combat.js:171-173`).

---

## Contraintes de Mocking et Stubbing

* **Stubbing Global** : Stubbe impérativement les fonctions d'effet visuel globales de l'UI (`window.render()`, `window.toast()`, `window.showActionConfirm()`, `window.saveSnapshot()`, `window.showUndoBar()`, `window.checkDeath()`, `window.renderLog()`, `window.renderRecap()`) en utilisant `vi.stubGlobal` dans le harnais Vitest.
* **Aucun import de UI** : Les tests ne doivent importer aucun fichier UI (notamment `ui.js` ou `ui/`).
* **Gestion des bugs historiques** : Si tu découvres des anomalies logiques pré-existantes dans le code de combat, **ne les corrige pas**. Documente-les simplement avec le tag `// TODO: bug historique` dans le fichier de test et liste-les dans ton rapport.

---

## Validation

1. Lancer la commande `npm test`.
2. S'assurer que tous les tests du fichier `tests/combat.test.js` s'exécutent avec succès sous l'environnement `happy-dom`.
