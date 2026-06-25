# ✅ Checklist validation navigateur — Lot 02c

> **But** : valider en conditions réelles les 5 volets du Lot 02c (indexation O(1), modales promisifiées, imports Firebase statiques, rendu DOM ciblé, 3 bugs historiques).
> **Pré-requis** : `npm run dev`, ouvrir l'app, console DevTools ouverte (onglet Console + Network).
> **Règle** : la console ne doit afficher **aucune** `ReferenceError` / `TypeError` pendant tout le parcours.

État : tests 74/74 ✅ · lint 0 err ✅ · build OK ✅ — reste la validation manuelle ci-dessous.

---

## 🎯 Volet 4 — Rendu DOM ciblé (LE point critique du lot)
Objectif : la saisie dans les inputs n'est plus perdue lors d'un re-rendu (sync Firebase ou action).

- [ ] **Focus conservé** : cliquer dans le champ **DM** d'une carte, taper un nombre, attendre ~2-3s (sync Firebase passe) → le focus et la valeur saisie **ne sautent pas / ne disparaissent pas**.
- [ ] **Pas de saut graphique** : pendant une sync, les cartes ne « clignotent » pas / ne se reconstruisent pas entièrement.
- [ ] **Cas A (structurel)** : ajouter OU supprimer un personnage → la grille se régénère correctement (toutes les cartes présentes, bon ordre).
- [ ] **Cas B (mise à jour)** : appliquer des dégâts/soin sans changer la liste → seule la carte concernée se met à jour (PV/PM/PC, barre, classe `ko`, état) sans reconstruire le reste.
- [ ] **Multi-onglets** : ouvrir l'app dans 2 onglets, modifier dans l'un → l'autre se met à jour **sans** perdre une saisie en cours.

## 🎯 Volet 2 — Modales de confirmation promisifiées
Tester chaque action qui ouvre la modale « action-confirm » :

- [ ] **Fin de round** (`endRound`) : OK applique, Annuler ne fait rien.
- [ ] **Fin de combat** (`endCombat`) : OK / Annuler.
- [ ] **Fin de session** (`endSession`) : OK / Annuler.
- [ ] **Reset total** (`resetAll`) : OK réinitialise, Annuler ne touche à rien.
- [ ] **Repos complet** (`reposComplet`) : OK / Annuler.
- [ ] **Roster** (3 appels) : actions de roster avec confirmation → OK / Annuler.
- [ ] **Annulation = pas d'effet** : dans chaque cas, cliquer Annuler (ou fermer) ne doit **rien** modifier (la promesse résout `false`).
- [ ] Double-clic rapide sur OK ne déclenche pas l'action deux fois.

## 🎯 Volet 3 — Imports Firebase statiques (plus de CDN dynamique)
- [ ] **Network** : recharger l'app, filtrer le Network → **aucune** requête vers `gstatic.com` / CDN `firebasejs`. Firebase est bundlé localement.
- [ ] **Statut connexion** : l'indicateur `#firebase-status` passe bien à connecté.
- [ ] **Sync OK** : une modif (dégâts) se propage à Firebase (visible dans un 2e onglet).
- [ ] **Forcer rafraîchissement** (`forceRefresh`, bouton refresh) : recharge l'état depuis Firebase sans erreur.
- [ ] **Assistant / Import règles COF** (`cof-import.js`) : lancer l'import des règles → écrit dans Firebase, `#cof-rules-status` se met à jour, pas d'erreur console.

## 🎯 Volet 5 — 3 bugs historiques corrigés
- [ ] **Bug 1 — garde DOM `applyDmg`** : appliquer des dégâts sur un perso non visible/non rendu (ex. via état filtré) → pas de `TypeError`, l'action est simplement ignorée si l'input n'existe pas.
- [ ] **Bug 2 — unicité `logId`** : enchaîner plusieurs dégâts/soins très rapidement → vérifier dans l'onglet Log/Recap qu'il n'y a **pas** de collision/écrasement d'entrées (chaque action = 1 ligne distincte).
- [ ] **Bug 3 — `niveau` manquant** : utiliser **Point de récupération** sur un perso dont `niveau` n'est pas défini → le PV gagné n'est **pas** `NaN` (fallback `niveau || 1` appliqué).

## 🎯 Volet 1 — Indexation O(1) (régression à surveiller)
Pas de test visuel dédié, mais vérifier que les fonctions remplacées par `getChar(id)` marchent toujours :
- [ ] Dégâts (`applyDmg`), Soin (`applyHeal`), ajustement PM (`adjPM`), récup PM (`recupPM`), ajustement PC (`adjPC`) → valeurs correctes.
- [ ] **Tour actif** (`setActiveTurn`) : changer le tour actif met bien en surbrillance la bonne carte.
- [ ] **Undo / Redo** (`undoChar` / `redoChar`) : annuler/refaire une action sur un perso → état correct restauré.
- [ ] **Barre Undo globale** (`undoLastAction`) : annuler la dernière action restaure bien tous les persos touchés.

---

## Sanity final
- [ ] Recharger l'app à froid (Ctrl+Shift+R) → aucune erreur au boot, état chargé.
- [ ] Console propre (0 erreur) sur tout le parcours.
- [ ] PWA : le nouveau `CACHE` du Service Worker s'installe (Application → Service Workers, version bumpée).

---

### Anomalie trouvée ? Note ici (fichier:ligne si possible)
- **[CORRIGÉ 24/06] `state.log` undefined → crash `applyDmg` (combat.js:60)** : Firebase RTDB n'écrit pas les tableaux vides → un état resynchronisé revient sans la clé `log`. Crash sur `state.log.push`, qui bloquait aussi `save()` (donc pas de persistance ni de propagation). Fix : garde invariant `if(!Array.isArray(state.log)) state.log=[]` dans `setState` (state.js). Bug pré-existant (indépendant de 02c), surfacé pendant la validation.
- **[ENV, pas un bug code] Firebase HS** : `.env.local` ramené vide par `vercel env pull` (creds restaurées depuis l'historique git) + règles RTDB mode-test expirées le 28/05/2026 (republier en `.read/.write: true`).

### Progression
- [x] Étape 0 — boot console propre ✅
- [x] Volet 4 — focus conservé pendant sync (2 onglets) ✅
- [x] Volet 4 — PV distant à jour via rendu ciblé ✅
- [x] Volet 4 — cas A : changement structurel (ajout/suppr perso) ✅
- [x] Volet 2 — modales promisifiées : Annuler = aucun effet, OK = action (5 boutons) ✅
- [x] Volet 3 — imports Firebase statiques : 0 requête `firebasejs`/CDN (gstatic = polices uniquement) ✅
- [x] Volet 5 — bug 1 (garde DOM applyDmg, plus de crash) ✅ · bug 2 (logId distincts) ✅ · bug 3 (fallback niveau||1, couvert tests) ✅
- [x] Volet 1 — indexation O(1) : dégâts/soin/PM/PC/tour OK pendant le parcours ✅

### Remontées UX (hors scope 02c → envoyées à Gémi)
- Undo permanent / bouton physique + undo sur les 5 actions (dont resetAll) → `to_gemini/2026-06-24_demande-undo-permanent.md`
- Point de Récup individuel par perso (en plus du global) → `to_gemini/2026-06-24_demande-point-recup-individuel.md`

## ✅ VALIDATION NAVIGATEUR LOT 02c : OK (24/06/2026)
Tests 74/74 · lint 0 err · build OK · 5 volets validés navigateur. 1 bug bloquant trouvé+corrigé (`state.log` undefined). Reste : commit fichier par fichier, handoff ZIP, mailbox clôture, ROADMAP/task.md → [CLOTURÉ].
