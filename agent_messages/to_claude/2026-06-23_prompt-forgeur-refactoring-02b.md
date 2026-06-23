# ✉️ Consignes de Forgeron — Refactoring Lot 02b (Tests Combat)

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-23 18:01:00  
**Sujet :** Instructions d'implémentation pour le Lot 02b — Tests de caractérisation (Combat)

---

## Objectif

Mettre en place une suite complète de tests unitaires pour le module `src/modules/combat.js` (nouvellement extrait) afin de caractériser son comportement actuel et de servir de filet de sécurité avant les optimisations de l'état et du rendu (Lot 02c).

## Fichier de Test à Créer

* **Chemin** : `tests/combat.test.js`
* **Technologie** : Vitest (exécuté via `npm test`)

## Comportements critiques à tester (à caractériser)

Les tests doivent s'assurer que les fonctions de combat mettent à jour l'état (`state`) de manière prévisible :

1. **Calculs des Dégâts (`applyDmg`)** :
   * Déduction des PV actuels selon le montant des dégâts.
   * Transition d'état automatique vers `Inconscient` ou `Mort` si les PV tombent à 0 (ou moins).
   * Comportement des dégâts négatifs ou égaux à 0 (ne doivent pas affecter les PV).
   * Gestion éventuelle des points de bouclier ou PV temporaires si la logique COF actuelle en contient.

2. **Calculs des Soins (`applyHeal`)** :
   * Ajout de PV actuels sans jamais dépasser `pvMax` du personnage.
   * Transition d'état depuis `Inconscient` vers `Normal` si le personnage récupère des PV.
   * Comportement sur un personnage déjà `Mort` (la logique COF interdit-elle de soigner un mort ? À caractériser).

3. **Ressources (PM et PC)** :
   * Consommation des Points de Mana (PM) et Points de Choc (PC) pour les compétences de combat.
   * Vérification des limites (pas de PM/PC négatifs).

4. **Gestion des États de Combat** :
   * Application d'un état (ex: `Ralenti`, `Aveugle`) à un personnage.
   * Retrait d'un état pour revenir à `Normal`.
   * Priorité ou cumul des états (est-ce que `Mort` écrase les autres ?).

## Contraintes et Règles
* **Aucun import de UI** : Les tests doivent importer uniquement `src/modules/combat.js` et manipuler un objet `state` simulé en mémoire. `ui.js` ne doit jamais être impliqué.
* **Iso-fonctionnalité stricte** : Si vous découvrez un bug historique ou un comportement étrange lors de l'écriture des tests, **ne le corrigez pas** tout de suite. Écrivez le test pour valider le comportement actuel (caractérisation), commentez le test avec un tag `// TODO: bug historique`, et signalez-le dans le rapport de handoff. Les corrections logiques se feront au Lot 02c.
* **Choix de Mocking (Arbitrage) :**
  Puisque le module `combat.js` appelle actuellement des fonctions globales d'effets de bord (`window.render()`, `window.toast()`, etc.), nous choisissons l'option **(a) Stubber `window.*` dans le harnais de test**. Dans tes tests Vitest, stubbe ces appels (ex: `vi.stubGlobal('render', vi.fn())`) plutôt que de modifier le code de `combat.js` à cette étape. L'isolation et le nettoyage propre de ces effets de bord UI seront réalisés durant la phase d'optimisation (Lot 02c).

## Validation
* Lancer la commande `npm test`.
* Tous les tests de combat doivent être au vert.
