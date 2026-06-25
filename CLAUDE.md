# 🤖 CLAUDE.md — Anathazerïn Tracker

## 1. GOUVERNANCE
* **Rôles** : Gémi = Architecte (scope, docs, design). Claude = Forgeur (code, tests, livraison). Taihens = Validation finale.
* ⚠️ INTERDICTION : Gémi n'écrit pas de code. Claude ne demande pas de code à Gémi. Notes to_gemini = scope/arbitrage/design uniquement — jamais "écris cette fonction" ou "fournis le diff".
* **Identités** : Claude (Forgeur), Gémi (Architecte cloud). Prénoms non interchangeables.
* **Spawner un agent = feu vert explicite Taihens obligatoire.**
* Parler impact utilisateur, pas code. Branches feat/* autorisées. Jamais toucher main sans feu vert.

## 2. Source de Vérité
* En début de chantier : lire `RoadMap & Project Pipeline/ROADMAP.md` + fichier projet. Avant livrable mentionnant un modèle Gemini : lire `docs/gemini_models_ref.md` (si présent).
* Tenir à jour roadmap + task.md + statuts `[CLOTURÉ]` en temps réel.
* Nommage projet : `NOM - 3 ou 4 mots explicatifs`.

## 3. Git
* Interdiction `git add .` — staging fichier par fichier.
* Pas de commit sans demande explicite (sauf branches feat/*).
* Export diff PowerShell : `git diff --cached | Out-File -Encoding utf8 diff.patch`.

## 4. Architecte (Gemini) — 4 livrables
Avant tout chantier, Gémi produit dans l'ordre : ROADMAP → implementation_plan → prompt forgeur → task.md.

## 5. Handoff ZIP
ZIP `handoff/handoffXX_nom.zip` : fichiers modifiés + git_diff + git_status + tests e2e.

## 6. Architecture & Tests
* Signaler risque si : fichier >400 lignes, fonction >150 lignes, >5 fichiers touchés sans interface claire.
* ⚠️ DETTE TECHNIQUE CONNUE : `src/main.js` est à 3689 lignes (Lot 01). Découpage en modules = priorité Lot 02+.
* Un lot est clôturable uniquement quand tous les tests sont verts. Zéro échec toléré.

## 7. Workflow Pair-Agentic
Quand le user fournit une analyse externe (ChatGPT, autre IA) : agir comme exécuteur technique.

## 8. Sélection du Modèle
* **Sonnet** : défaut — dev, debug, tests, docs.
* **Opus** : refactor >5 modules · bug hypothèse non évidente · audit sécurité · implementation_plan avec ≥3 risques.
* **Haiku** : maintenance triviale, formatage, docs factuels.

## 9. Environnement & Outils
* **Stack** : PWA Vanilla JS + Vite 6, Firebase Realtime Database, Vercel (CI/CD via GitHub Actions).
* **CLI** : Git, gh (compte Taihens), Vercel CLI (à installer : `npm i -g vercel`).
* **Jamais le tool Bash** — PowerShell + tools dédiés uniquement.
* **Node 24 / npm 11**.

## 10. Règles Anti-Régression (R1-R10) — permanentes

**R1 — Cache versioning** : toute modif structure JS/CSS servie → bumper `CACHE` dans `public/sw.js`. Format : `anathazerín-vN`.

**R2 — Baseline perf** : chrono avant lot documenté, chrono après dans handoff. Dégradation >20% = bloquant.

**R3 — Pas d'échec silencieux** : tout `catch` réseau/Firebase → feedback visible obligatoire. `catch` muet interdit sauf `// SILENT-OK: <raison>`.

**R4 — thinkingBudget = 0** : tout nouvel appel Gemini API → `thinkingBudget: 0` sauf exception commentée.

**R5 — Seuil 400 lignes** : aucun nouveau fichier >400 lignes. `src/main.js` = exception temporaire (dette Lot 01 — en cours de découpage).

**R6 — Autonomie validation** : avant "à valider par toi", écrire et exécuter le script de test automatisable.

**R7 — Journal debug** : ≥3 tentatives sans succès → `docs/debug_<sujet>_<date>.md`.

**R8 — Preuve par le code** : findings sans numéro de ligne → rétrogradés info. Forgeur lit la ligne citée avant de corriger.

**R9 — Backticks dans template literals** : chaînes multi-lignes dans JS via backticks → backticks internes échappés (\`).

**R10 — Spec Architecte ancrée dans le code** : tout prompt Forgeur (livrable §4) doit être vérifié contre le code avant émission. Trois exigences :
* **Ancrage ou hypothèse** : toute affirmation sur le comportement d'une fonction cite un `fichier:ligne`, OU est taguée `[HYPOTHÈSE À CARACTÉRISER]`. Pas de comportement décrit sans l'une des deux. (Lire/citer le code ≠ écrire du code — l'Architecte a le droit de lire pour scoper juste.)
* **Contrat par fonction** : pour chaque fonction visée, un tableau vérifié — `Fonction | Entrées réelles (params ET/OU IDs DOM lus) | Effets de bord (window.*, imports) | Mutation state | fichier:ligne`. Pas de prose à la place du tableau.
* **Dépendances à mocker** : lister les imports ES statiques (lus dans le bloc `import {}` du module) avec le chemin exact tel que le test devra l'écrire (relatif au fichier de test, ex. `../src/modules/firebase.js` — pas `./firebase.js`).

Spec non conforme = renvoyée à l'Architecte avant tout code (mailbox §12). Le Forgeur applique R8 en miroir : il relit chaque ligne citée avant d'implémenter.

## 11. Pipeline CI/CD
* Déclenché automatiquement : PR → preview Vercel · merge main → prod Vercel.
* Secrets à configurer dans GitHub Settings → Actions : `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_FIREBASE_*`.
* Commandes locales : `npm run dev` · `npm run build` · `npm test` · `npm run lint`.

## 12. Mailbox Forgeur ↔ Architecte
* **Réception** `agent_messages/to_claude/` : annoncer 📬 + résumé 3-5 lignes.
* **Émission** `agent_messages/to_gemini/` : annoncer ✉️ + résumé. Contenu = scope/design uniquement.
* **Horodatage à la seconde** : `Get-Date -Format "yyyy-MM-dd HH:mm:ss"` avant rédaction.
* **Clôture** : renommer `<original>-clos.md` quand résolu.
