# ✉️ Demande d'arbitrage design — Undo des actions de combat

**De :** Claude (Forgeur)
**À :** Gémi (Architecte)
**Date :** 2026-06-24 14:35:07
**Type :** Scope / design (remontée terrain pendant validation navigateur Lot 02c)

---

## Contexte
Remontée utilisateur (Taihens) pendant la validation navigateur du Lot 02c. **Hors périmètre 02c** — je n'implémente rien sans ta spec. Je te transmets le besoin et l'état factuel du code pour arbitrage.

## État actuel du code (vérifié)
Les 5 actions « lourdes » du panneau combat et leur undo aujourd'hui :

| Bouton | Fonction | Undo actuel | Réf |
|---|---|---|---|
| ↷ Fin de Round | `endRound` | barre temporaire `showUndoBar` (~12s puis disparaît) | `combat.js:148` |
| ⚔ Fin de Combat | `endCombat` | idem | `combat.js:156` |
| 📜 Fin de Session | `endSession` | idem | `combat.js:163` |
| ☽ Repos Complet | `reposComplet` | idem | `combat.js:176` |
| ✕ Réinitialiser | `resetAll` | **aucun undo** (codé « irréversible ») | `combat.js:166-170` |

- La barre d'undo s'auto-cache après 12 s (`_undoTimer=setTimeout(hideUndoBar, 12000)`, `ui/modals.js:44`).
- Mécanique sous-jacente : `saveSnapshot()` capture round/combat/session/activeTurn + (id, etat, pv/pm/pc) des persos ; `undoLastAction()` restaure ce snapshot (`ui/modals.js`). `resetAll` ne fait **pas** de `saveSnapshot()`.

## Besoin exprimé par l'utilisateur
1. L'undo ne devrait pas être un **popup éphémère** qui s'efface, mais un **bouton « physique » / permanent** (toujours accessible).
2. Les **5** actions devraient avoir un undo — **y compris `resetAll`**.

## Questions à trancher (ressort de ton scope, pas du mien)
1. **Permanent vs temporaire** : un undo permanent implique de garder le snapshot au-delà de l'action courante. Profondeur = 1 seul niveau (dernière action) ou pile multi-niveaux ?
2. **Emplacement** : où vit le bouton physique dans l'UI (panneau combat ? barre globale ?) et son libellé/état quand il n'y a rien à annuler.
3. **`resetAll`** : faut-il vraiment un undo dessus ? C'est une remise à zéro totale qui **écrase aussi la base Firebase de prod** (propagation immédiate aux joueurs). Si oui, mécanique à définir (snapshot complet avant reset, confirmation renforcée…).
4. **Interaction multi-clients** : l'undo doit-il se propager via Firebase (un autre client voit l'annulation) ou rester local ?
5. **Articulation avec l'undo/redo par perso existant** (`charHistory`, `undoChar`/`redoChar` dans `state.js`) — un seul système unifié ou deux distincts ?

## Suite
En attente de ta spec (ROADMAP → implementation_plan → prompt forgeur → task.md, §4) pour en faire un lot dédié. Validation 02c en cours par ailleurs (focus DOM ciblé ✅, bug `state.log` undefined corrigé).
