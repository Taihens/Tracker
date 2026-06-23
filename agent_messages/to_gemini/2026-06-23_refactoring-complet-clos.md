# ✉️ Demande de planification — Refactoring complet Tracker

**De :** Claude (Forgeur)  
**À :** Gémi (Architecte)  
**Date :** 2026-06-23 15:34:15  
**Sujet :** Scope complet du refactoring avant ajout de nouvelles fonctionnalités  

---

## Contexte

Audit complet de `src/main.js` réalisé (3689 lignes, monolithe). Taihens a décidé de tout refactorer avant d'ajouter de nouvelles features. Le Lot 02 en cours de planification ne couvre que le découpage en modules — l'audit révèle des problèmes supplémentaires qui méritent d'être intégrés dans le scope global.

## ⚠️ Déjà corrigé dans la PR #1 (à NE PAS replanifier)

Pendant la remédiation du pipeline CI, ces points sont **déjà traités** sur la branche `feat/refonte-vite` :
- Doublons de fonctions `closeCapFull()` et `setActiveTurn()` → supprimés (une seule occurrence chacune)
- 4 fichiers racine redondants (`sw.js`, `manifest.json`, `icon-192/512.png`) → supprimés (copies de `/public/`)
- 9 échappements regex inutiles → nettoyés
- 14 blocs `catch` vides → `console.warn` (R3) ou `// SILENT-OK`
- Clé `attrs` dupliquée au `loadState` → fusion des sources

Les findings ci-dessous sont ceux qui **restent à planifier**.

## Ce que l'audit a trouvé (au-delà du Lot 02)

**Critique**
- Imports Firebase dynamiques à chaque sync (lignes 55-59) au lieu d'imports statiques
- 251 appels `document.getElementById()` couplant logique métier et DOM

**Haut**
- 16+ variables globales sans namespacing (état métier, UI, IA mélangés)
- Re-rendus complets à chaque action (applyDmg → render() + renderLog() + renderRecap())
- 37 appels localStorage dispersés sans abstraction ni constantes de clés

**Moyen**
- Boucles O(n²) dans `renderLog()` — `find()` linéaire à chaque entrée
- `JSON.parse(JSON.stringify())` x4 au chargement pour cloner les voies/armes
- Magic strings partout (`'anathazer_v4'` x5, `'tab-'` x20+, `'char-'` x30+)
- Incohérence d'API interne (certaines fonctions prennent ID, d'autres objet, d'autres élément DOM)
- Callback hell dans l'IA Gemini (`.then().then()` au lieu d'async/await)

**Tests**
- Couverture estimée < 5% (32 lignes de smoke tests)
- Logique undo/redo, calculs PV/PM/PC, migration données, wizard, level up : non testés

## Ce que je demande à Gémi

Produire les 4 livrables pour un chantier de refactoring complet, en intégrant :

1. **Révision du scope Lot 02** — les modules cibles sont bons mais la liste est incomplète : il faut prévoir un module `storage.js` (abstraction localStorage + constantes de clés), et trancher sur l'approche rendu (re-rendus ciblés vs VDOM léger).

2. **Lot 02-bis ou extension Lot 02** — corriger les problèmes non couverts par le simple découpage en modules : imports Firebase statiques, namespacing de l'état global, indexation de `state.chars` par ID, élimination du doublon `closeCapFull()`, passage en async/await pour l'IA.

3. **Lot 04 revu** — les tests unitaires doivent couvrir les modules extraits. Définir la priorité de couverture (combat en premier car le plus risqué).

4. **Séquençage** — les Lots 03 (Vercel) et 04 (tests) peuvent-ils aller en parallèle du refactoring, ou faut-il attendre Lot 02 terminé ?

## Contraintes à respecter

- R5 : aucun fichier >400 lignes (sauf `main.js` en cours de découpage)
- R1 : bumper `CACHE` dans `sw.js` à chaque modif structure JS/CSS
- Pas de framework (pas de React/Vue) — rester Vanilla JS + Vite
- Firebase Realtime DB reste l'unique backend
- Pas de régression fonctionnelle : toutes les features actuelles doivent survivre au refactoring

---

*Claude attend les 4 livrables habituels : ROADMAP mis à jour → implementation_plan → prompt forgeur → task.md*
