# ✉️ Consignes de Forgeron — Refactoring Lot 02b (Tests Combat)

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-23 18:35:00  
**Sujet :** Instructions d'implémentation révisées pour le Lot 02b — Tests de caractérisation (Combat)

---

## Objectif

Mettre en place une suite complète de tests unitaires pour le module `src/modules/combat.js` afin de caractériser son comportement actuel et de servir de filet de sécurité avant les optimisations de l'état et du rendu (Lot 02c).

## Fichier de Test à Créer

* **Chemin** : `tests/combat.test.js`
* **Technologie** : Vitest (exécuté via `npm test`)

## Environnement de Test (DOM)

L'environnement Vitest a été configuré avec `happy-dom` (Lot 02b) pour fournir un DOM virtuel. Le code de `combat.js` lisant ou écrivant dans le DOM (ex: `document.getElementById('dmg-'+id)`), tu devras créer les éléments HTML nécessaires (fixtures DOM) dans les blocs `beforeEach` de tes tests avant d'appeler les fonctions de combat, ou stubber finement le DOM si besoin.

## Comportements critiques à tester (à caractériser)

Les tests doivent s'assurer que les fonctions de combat mettent à jour l'état (`state`) de manière prévisible :

1. **Calculs des Dégâts (`applyDmg`)** :
   * Déduction des PV actuels selon le montant saisi dans l'input DOM `#dmg-[id]` (la valeur par défaut de l'input doit être simulée dans le DOM).
   * Vérification du statut : passage automatique de l'état à `Inconscient` si les PV tombent à 0 (ou moins).
   * *Note factuelle* : Le statut `Mort` n'est pas géré par `applyDmg` (il est décidé par `window.checkDeath()`, hors scope de ce module). Ne teste pas la transition vers `Mort` dans ce lot.
   * *Note factuelle* : Il n'y a pas de points de bouclier ou de PV temporaires à tester.

2. **Calculs des Soins (`applyHeal`)** :
   * Ajout de PV actuels via la valeur saisie dans l'input DOM `#dmg-[id]` sans jamais dépasser `pvMax` du personnage.
   * Transition d'état depuis `Inconscient` vers `Normal` si le personnage récupère des PV.
   * *Note factuelle* : `applyHeal` ne gère pas la résurrection ou les personnages déjà morts.

3. **Ajustements de Ressources (`adjPM` / `adjPC`)** :
   * Modification et clamping (bornage) des PM et PC entre `0` et leur valeur maximum (`pmMax` / `pcMax`).
   * *Note factuelle* : Il n'y a pas de compétences de combat spécifiques à tester, seulement ces fonctions génériques d'ajustement.

4. **Nettoyage des États de Combat (Fin de Round & Combat)** :
   * **`endRound`** : Doit effacer l'état `Surpris` de tous les personnages concernés.
   * **`endCombat`** : Doit effacer les états `Étourdi` et `Surpris` de tous les personnages concernés.

## Contraintes de Mocking et Import

* **Mocks de modules (Imports ES)** : `combat.js` importe statiquement `save` depuis `./firebase.js`. Tu dois mocké `./firebase.js` (par exemple : `vi.mock('./firebase.js', () => ({ save: vi.fn() }))`) pour éviter d'appeler le stockage ou les requêtes réseau réelles lors des tests.
* **Stubbing Global** : Stubbe les autres fonctions globales d'effets de bord (`window.render()`, `window.toast()`, etc.) en utilisant `vi.stubGlobal` dans le harnais de test Vitest.
* **Aucun import de UI** : Les tests ne doivent jamais importer `ui.js`.
* **Iso-fonctionnalité stricte** : Si tu découvres un bug historique lors de l'écriture des tests, **ne le corrige pas**. Documente-le avec un tag `// TODO: bug historique` dans le test et signale-le dans ton rapport.

## Validation
* Lancer la commande `npm test`.
* Tous les tests de combat doivent être au vert.
