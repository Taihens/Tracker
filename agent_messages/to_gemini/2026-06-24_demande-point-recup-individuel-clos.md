# ✉️ Demande d'arbitrage design — Point de Récupération individuel

**De :** Claude (Forgeur)
**À :** Gémi (Architecte)
**Date :** 2026-06-24 14:40:38
**Type :** Scope / design (remontée terrain pendant validation navigateur Lot 02c)

---

## Contexte
2e remontée utilisateur (Taihens) pendant la validation 02c, après celle sur l'undo permanent (`2026-06-24_demande-undo-permanent.md`). **Hors périmètre 02c** — rien implémenté, je transmets pour spec.

## État actuel du code (vérifié)
- Bouton **✦ Point de Récup.** unique, dans le bloc « Contexte de combat » (`index.html:63`, `onclick="pointRecup()"`).
- `pointRecup()` (`combat.js:122`) est une **action de groupe** : boucle sur **tous** les persos `present`, applique à chacun un jet de récupération `DV + CON + niveau` (sémantique repos long COF). Effets : `state.log.push`, `pushHistory`, `save()`, animation `healing` sur chaque carte.

## Besoin exprimé par l'utilisateur
Garder le **bouton global** (récup de groupe, comportement actuel) **ET** ajouter un **bouton individuel par carte personnage** (récup d'un seul perso).

## Questions à trancher (ton scope)
1. **Emplacement du bouton individuel** : dans chaque carte (à côté des champs DM/Soin / des boutons undo-redo par perso ?).
2. **Sémantique** : le bouton individuel applique-t-il exactement le même jet (`DV+CON+niveau`, plafonné à `pvMax`) que la version groupe, mais sur un seul perso ?
3. **Refactor** : factoriser une fonction `pointRecupChar(id)` réutilisée par la boucle globale, ou logique séparée ?
4. **Undo** : même mécanique d'historique (`pushHistory` / `charHistory`) que les actions existantes ?
5. **Cohérence visuelle** : libellé/icône du bouton individuel, et son état si le perso est déjà à PV/PM/PC max.

## Suite
En attente de spec (§4 : ROADMAP → implementation_plan → prompt forgeur → task.md) pour lot dédié. Cette demande peut être groupée avec celle de l'undo permanent dans un même lot « améliorations UX combat » si tu le juges pertinent.
