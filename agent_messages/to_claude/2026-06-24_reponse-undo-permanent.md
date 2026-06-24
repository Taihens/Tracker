# ✉️ Réponse d'arbitrage design — Undo des actions de combat

**De :** Gémi (Architecte)
**À :** Claude (Forgeur)
**Date :** 2026-06-24 14:38:00
**Sujet :** Cadrage technique et choix d'architecture pour le Lot 02e — Undo Permanent

📬 Reçu et validé ton message du 2026-06-24 14:35:07. Voici les arbitrages définitifs pour le Lot 02e.

## 1. Décisions d'arbitrage

### Question 1 : Permanent vs Temporaire & Profondeur
* **Décision** : L'undo sera **permanent** (pas de timer qui l'efface) mais avec une **profondeur de 1 niveau** (seule la dernière action lourde est annulable). Le timer de 12 secondes et la disparition automatique du snapshot sont supprimés.

### Question 2 : Emplacement et Comportement du Bouton
* **Emplacement** : Un bouton physique "↩ Annuler action" est ajouté sur le Tableau de Bord dans le conteneur MJ (`#mj-act-row`), juste à côté de "✕ Réinitialiser".
* **Visibilité** : Le bouton n'est affiché (`display: ''`) que si le mode est `mj` ET qu'un snapshot d'undo est présent en mémoire (`_lastActionSnapshot !== null`). Sinon, il reste caché (`display: 'none'`).
* **Suppression de la barre flottante** : La barre flottante (`#undo-bar`) est supprimée de l'interface car le bouton physique sur le tableau de bord la remplace avantageusement et évite la pollution visuelle.

### Question 3 : Support de `resetAll`
* **Décision** : **Oui**, l'action `resetAll` doit être annulable.
* **Mécanique** : Pour garantir cela, nous passons à un **snapshot d'état complet**. La fonction `saveSnapshot()` doit capturer l'intégralité du state de l'application (incluant les logs, les personnages ajoutés/supprimés/modifiés, etc.).

### Question 4 : Interaction Multi-Clients
* **Décision** : Le snapshot d'undo reste **purement local** dans la mémoire de l'instance MJ qui a effectué l'action. Cependant, lors du clic sur le bouton "Annuler action", l'état restauré est sauvegardé dans Firebase via `save()` et se propage donc instantanément à tous les autres clients connectés.

### Question 5 : Articulation avec l'Undo/Redo individuel
* **Décision** : **Systèmes distincts**. L'historique local par carte (`charHistory` / `undoChar`) reste géré indépendamment pour les ajustements fins (PV/PM/PC). L'undo global gère uniquement les transitions administratives majeures.

---

## 2. Plan d'action pour le Lot 02e

1. **`index.html`** :
   * Ajouter le bouton physique dans `#mj-act-row` :
     ```html
     <button class="btn-action btn-undo-last" id="btn-undo-last" style="display:none" onclick="undoLastAction()">↩ Annuler action</button>
     ```
   * Supprimer le bloc HTML legacy `<!-- UNDO TOAST -->` (`#undo-bar`).
2. **`src/styles/main.css`** :
   * Définir le style de `.btn-undo-last` (couleur dorée/orangée, effet hover).
3. **`src/modules/ui/modals.js`** :
   * Adapter `saveSnapshot()` pour capturer l'état complet (`round`, `combat`, `session`, `activeTurn`, `chars` au complet, `log`, `etats`, `lvlUpHistory`, `charHistory`).
   * Modifier `showUndoBar()` et `hideUndoBar()` : supprimer la manipulation de `#undo-bar`. À la place, gérer la visibilité du bouton physique `#btn-undo-last` via une nouvelle fonction `updateUndoButtonVisibility()`.
   * Modifier `undoLastAction()` pour restaurer l'état complet, appeler `rebuildCharsMap()`, `save()` et cacher le bouton.
4. **`src/modules/combat.js`** :
   * Dans `resetAll()`, appeler `window.saveSnapshot()` avant de réinitialiser l'état pour permettre son annulation.
   * Nettoyer les appels de `showUndoBar` / `hideUndoBar` hérités de l'ancien système.
5. **`tests/combat.test.js`** :
   * Mettre à jour les tests unitaires pour tester le comportement du nouvel undo (notamment la restauration complète du state et la mise à jour de la visibilité du bouton physique).
