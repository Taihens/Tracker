# ✉️ Forgeur → Architecte — Lot 02a clôturé

**Horodatage** : 2026-06-23 18:01:04
**Objet** : Découpage modulaire pur de `src/main.js` (Lot 02a) — livré, iso-fonctionnel. Divergences de scope/design à arbitrer.

---

## Résultat
`src/main.js` : **3678 → 210 lignes**. 29 fichiers sous `src/modules/` (tous < 400 l, R5 respecté).
Validation locale : **lint 0 erreur · build OK (32 modules) · smoke 3/3**. R1 fait (CACHE `v6 → v7`).
Comportement : strictement iso-fonctionnel (aucune optimisation — état/async/Firebase restent reportés en 02c, conforme).

## Divergences vs ta liste de modules (organisationnel, dans l'esprit du scope)
1. **Modules ajoutés hors liste pour tenir R5** (<400 l) : `levelup.js` (+ `levelup/wizard.js`, `levelup/pending.js`), `assistant.js` (+ `assistant/gemini.js`, `assistant/cof-import.js`). La logique level-up et l'assistant Gemini étaient noyées dans le monolithe ; isolées car volumineuses.
2. **Sous-dossiers** : `fiches/` (render/wizard/edit), `ui/` (render/tabs/modals/settings/etats/mode/toast), `constants/default-chars.js`. Pareil : seul moyen de rester sous 400 l sans casser la cohésion.
3. **Helpers `fb*` co-localisés** dans leur module métier (ex. `fbSavePendingChars` dans `roster.js`) plutôt qu'un `firebase.js` fourre-tout — `firebase.js` ne garde que connexion/sync/save.

## Finding de design (important pour 02c)
- `index.html` + les template strings appellent **~123 fonctions par nom global nu** (`onclick="applyDmg(...)"`). En ES module, la portée est module, pas globale → un nouveau fichier `bindings.js` ré-expose ces fonctions sur `window`. **Le métier n'importe jamais l'UI** (ta règle tenue) : les appels métier→rendu passent par `window.render()` etc.
- 3 data-globals réassignées au runtime (`appMode`, `charWizard`, `editData`) exposées via **getters live** — un binding statique deviendrait obsolète après réassignation.
- **Piège évité** : `pendingChars` / `pendingLvlUps` sont réassignés à chaque sync Firebase. Les lire via `window.x` aurait capturé un snapshot mort (perte silencieuse de soumissions joueur). Corrigé par import ES direct (live binding).

## Garde-fou (faute de tests comportementaux avant 02b)
Vérif statique anti-bouton-mort : 123 cibles inline + 32 `window.*` croisées contre l'ensemble exporté/bindé → **0 référence morte**.
⚠️ Il reste la **validation navigateur manuelle** (Taihens) : console sans `ReferenceError`, test des handlers critiques (onglets, dégâts/soin, fin de round, dés, wizard, édition fiche, level-up, thème). C'est le seul filet jusqu'au Lot 02b.

## Question d'arbitrage (design)
La cible 02b (tests de combat) suppose `combat.js` testable en isolation. Or `combat.js` appelle `window.render()`/`window.toast()` etc. (non importés). Pour les tests : préfères-tu (a) qu'on stubbe `window.*` dans le harnais de test, ou (b) qu'on isole en 02c la logique pure (calcul PV/PM/PC) des effets de bord UI ? Ça touche le scope 02b/02c — à toi de trancher.

— Claude (Forgeur)
