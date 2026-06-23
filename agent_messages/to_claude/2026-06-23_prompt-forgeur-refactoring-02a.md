# ✉️ Consignes de Forgeron — Refactoring Lot 02a (Déplacement Pur)

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-23 16:49:00  
**Sujet :** Instructions d'implémentation pour le Lot 02a — Déplacement modulaire pur (Sans changement de comportement)

---

## Objectif

Découper le monolithe `src/main.js` en modules ES6 dans `src/modules/` de manière strictement iso-fonctionnelle (aucun changement de comportement ou d'optimisation). Ce lot sert à poser la structure propre sans introduire de bugs de logique.

## Direction des Dépendances Imposée

Pour éviter tout import circulaire, respecte impérativement cette hiérarchie :
1. **`constants.js`** / **`cof-classes.js`** : N'importent aucun autre module de l'app.
2. **`storage.js`** : Importe `constants.js`.
3. **`state.js`** / **`firebase.js`** : Importent les constantes et le stockage.
4. **Modules Métier (`dice.js`, `combat.js`, `messages.js`, `fiches.js`, `roster.js`, `recap.js`)** : Importent l'infra (`state.js`, `firebase.js`) et les constantes.
5. **`ui.js`** : Importe les modules métier et l'infra. Gère les liaisons DOM.
6. **`main.js`** : Point d'entrée. Importe `ui.js` et initialise.

⚠️ **Règle absolue** : Les modules métier et l'infra ne doivent **jamais** importer `ui.js`. Si un changement d'état requiert un re-rendu, c'est à la couche UI de s'abonner, d'écouter les callbacks ou de déclencher le rendu suite à l'appel d'une fonction métier.

## Gestion de la contrainte R5 (400 lignes max)

- Si le code extrait pour `ui.js`, `combat.js` ou `fiches.js` menace de dépasser 400 lignes, **découpe-le immédiatement** en sous-fichiers dans un répertoire dédié (ex: `src/modules/ui/events.js`, `src/modules/ui/render.js`, etc.).
- Tout nouveau fichier créé doit faire moins de 400 lignes.

## Ce qui est exclu de ce lot (À NE PAS FAIRE)
- Ne pas passer en `async/await` pour l'IA Gemini (callback hell toléré pour l'instant).
- Ne pas changer l'indexation de `state.chars` (recherches linéaires conservées).
- Ne pas toucher à la logique de rendu (re-rendu global `render()` conservé).
- Ne pas passer les imports Firebase en statiques si cela exige des refontes d'initialisation complexes (conserver la synchro à l'identique).

## Règles permanentes
- **R1** : Penser à bumper `CACHE` dans `public/sw.js` (ex: `anathazerin-v7`).
- **R3** : Pas de `catch` vide. Utiliser `console.warn` ou commenter explicitly `// SILENT-OK: <raison>`.

## Validation
- L'application doit fonctionner de manière 100% identique.
- `npm run lint`, `npm run build`, `npm test` doivent être totalement verts.
