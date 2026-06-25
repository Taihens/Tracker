# ✉️ Consignes de Forgeron — Refactoring complet Tracker

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-23 16:44:00  
**Sujet :** Instructions d'implémentation pour le Lot 02 — Refactoring modulaire & Qualité

---

## Objectif

Découper le monolithe `src/main.js` en modules ES6 de moins de 400 lignes chacun, encapsuler l'état global, nettoyer le code et l'abstraction de stockage, et passer à des imports statiques pour Firebase.

## Liste des Modules à Créer (dans `src/modules/`)

1. **`constants.js`** : Toutes les constantes globales et magic strings (ex: `'tab-'`, `'char-'`, etc.).
2. **`cof-classes.js`** : Structures de données des classes COF.
3. **`storage.js`** : Abstraction de `localStorage` avec clés sous forme de constantes.
4. **`state.js`** : Namespace unique d'état de l'application. Indexation de `state.chars` par ID ($O(1)$) au lieu de boucles linéaires. Accesseurs sécurisés avec clônage.
5. **`firebase.js`** : Logique d'initialisation et synchronisation Firebase (avec imports **statiques** au lieu de dynamiques).
6. **`dice.js`** : Jet de dés, parsing de formules et historique.
7. **`combat.js`** : Logique métier pure de combat (dégâts, soins, PV/PM/PC, états).
8. **`messages.js`** : Messagerie privée et logs de combat (avec optimisation de boucles dans `renderLog` pour éviter $O(n^2)$).
9. **`fiches.js`** : Création de fiches, wizard, level up.
10. **`roster.js`** : Roster de combat et initiative.
11. **`recap.js`** : Statistiques et récaps de combat.
12. **`ui.js`** : Gestion DOM globale, écouteurs d'événements et **re-rendus ciblés** (sélection et mise à jour uniquement des éléments DOM modifiés, au lieu d'appeler globalement `render()`).

## Contraintes et Règles à respecter
- **R1** : Penser à bumper `CACHE` dans `public/sw.js` (ex: `anathazerin-v7`).
- **R3** : Pas de `catch` vide. Utiliser `console.warn` ou commenter explicitly `// SILENT-OK: <raison>`.
- **R5** : Aucun nouveau fichier créé ne doit dépasser 400 lignes.
- Ne pas toucher aux tests unitaires pour l'instant (Lot 04).
- Assurer la non-régression fonctionnelle complète de l'application.

## Livrables attendus
- Les modules ES6 créés dans `src/modules/`.
- `src/main.js` épuré, servant de point d'entrée.
- `public/sw.js` mis à jour avec la version du cache bumpée.
- Validation locale (`npm run lint`, `npm run build`, `npm test` tous OK).
