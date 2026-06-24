# 🤖 PROMPT FORGEUR — Lot 06 — Assistant IA & RAG PDF

**De :** Gémi (Architecte)  
**À :** Claude (Forgeur)  
**Date :** 2026-06-24 18:11:53  
**Sujet :** Instructions pour l'implémentation du Lot 06 (Assistant IA & RAG PDF)  

---

## 1. Objectifs du Lot
Ce lot met en place une recherche vectorielle locale (RAG) dans le navigateur, basée sur les PDF du jeu (règles et campagne scénarios 1-9), automatise l'injection des 10 derniers logs de combat dans le contexte de l'assistant Gemini, et ajoute un bouton de génération de récit de combat romancé rédigé par l'IA.

---

## 2. Contrats par fonction (Exigence R10)

| Fonction | Entrées réelles (params / DOM) | Effets de bord (window.*, imports) | Mutation state | Fichier cible |
| :--- | :--- | :--- | :--- | :--- |
| `generate-embeddings.js` | Arguments en ligne de commande (clé API), lit les fichiers PDF locaux via `pdftotext` | Écrit des fichiers JSON dans `public/` | Aucun | `scripts/generate-embeddings.js` (Nouveau) |
| `loadRAGIndexes` | Aucun | Appelle `fetch` pour rules et campaign embeddings, écrit dans variables locales | Aucun | `src/modules/assistant/gemini.js` (Nouveau) |
| `cosineSimilarity` | `vecA` (array), `vecB` (array) | Aucun (fonction pure) | Aucun | `src/modules/assistant/gemini.js` (Nouveau) |
| `sendAI` | Aucun (`#ai-input`, `#ai-char-sel`) | Appelle l'API d'embeddings, calcule la similarité cosinus, effectue le fetch vers Gemini Worker/API | Aucun | `src/modules/assistant/gemini.js:250-302` |
| `buildAiContext` | Aucun | Lit `#g-cname` et `state.log` | Aucun | `src/modules/assistant/gemini.js:77-120` |
| `generateNarrativeSummary` | Aucun | Lit `state.log`, affiche une modale HTML avec le récit généré, appelle le Worker Gemini | Aucun | `src/modules/assistant/gemini.js` (Nouveau) |
| `renderLog` | Aucun | Affiche le bouton "Récit de combat IA" dans la ligne d'actions du journal | Aucun | `src/modules/messages.js:199-218` |

---

## 3. Spécifications détaillées d'implémentation (Ancrage fichier:ligne)

### 📂 1. Script de génération d'embeddings hors-ligne (`scripts/generate-embeddings.js`)
* **Découpe et parsing** :
  * Découper les PDF par page en appelant `pdftotext.exe` en arrière-plan : `pdftotext -f <page> -l <page> "<pdf_file>" -`.
  * Découper le texte extrait de chaque page en chunks d'environ 700 caractères avec 100 caractères de chevauchement.
  * Conserver le nom du fichier source et le numéro de page.
* **Vectorisation** :
  * Envoyer les chunks par lots de 100 maximum à l'API Gemini : `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${API_KEY}`.
  * *Rules* : Indexer `pdf/chroniques-oubliees.pdf` et `pdf/bestiaire COF.pdf`. Enregistrer dans `public/cof_rules_embeddings.json`.
  * *Campaign* : Indexer dynamiquement via un glob ou une lecture de dossier les fichiers correspondant aux scénarios 1 à 9 (ex: `pdf/[1-9]*.pdf` ou regexp `/^[1-9]\..*\.pdf$/` sur le dossier `pdf/`, excluant les scénarios 10 à 13 pour éviter le spoil). Enregistrer dans `public/cof_campaign_embeddings.json`.


### 📖 2. Recherche vectorielle locale (`src/modules/assistant/gemini.js`)
* **Chargement des Index** :
  * Créer les variables en cache `let rulesIndex = null, campaignIndex = null;`.
  * Implémenter `loadRAGIndexes()` : charge `public/cof_rules_embeddings.json` au démarrage (ou lors de `initAssistantTab`), et `public/cof_campaign_embeddings.json` **uniquement** si `appMode === 'mj'`.
* **Cosine Similarity** :
  * Implémenter `cosineSimilarity(vecA, vecB)` calculant le produit scalaire divisé par le produit des normes.
* **Recherche & Injection (dans `sendAI`)** :
  * Si `getGeminiKey()` est configurée, appeler d'abord l'API d'embeddings pour vectoriser la question de l'utilisateur (`models/text-embedding-004`).
  * Calculer la similarité cosinus avec tous les chunks chargés. Trier par ordre décroissant et conserver les **3 meilleurs**.
  * Formater et injecter ces chunks dans les instructions système avant d'appeler l'API de chat completion :
    ```
    === CONTEXTE SUPPLÉMENTAIRE DES RÈGLES / CAMPAGNE (RAG) ===
    [Chunk 1]
    ...
    ```
  * Si aucune clé n'est configurée, afficher un discret toast ou log d'avertissement et continuer en mode dégradé (sans RAG).

### ⚔️ 3. Auto-injection des logs de combat (`src/modules/assistant/gemini.js:77-120`)
* Dans `buildAiContext()`, sous la condition `if(aiCtx.combat)` :
  * Filtrer `state.log` pour extraire les 10 dernières entrées correspondant au combat courant (`session === state.session && cbt === state.combat`).
  * Formater chaque entrée en ligne texte simple (ex: `Round 2: Echidna lance d20 et obtient 15`) et l'ajouter au contexte de combat.

### 📝 4. Résumé narratif de fin de combat
* **Bouton MJ** : Dans `renderLog()` dans `src/modules/messages.js:217`, ajouter un bouton `✨ Récit de combat IA` à côté du bouton "Vider" (visible uniquement si `appMode === 'mj'`).
* **Logique (`gemini.js`)** :
  * Implémenter `generateNarrativeSummary()` :
    * Filtrer tous les logs du combat actif.
    * Si vide, lever une alerte.
    * Envoyer ces logs à Gemini avec la consigne : *"Rédige un récit épique, immersif et romancé de ce combat en français (2-3 paragraphes), mettant en valeur les actions clés. Style JDR héroïque-fantastique."*
    * Afficher le résultat dans une modale simple ou un overlay muni d'un bouton de copie et d'un bouton de fermeture.

---

## 4. Dépendances à mocker dans les tests unitaires
* Créer un fichier `tests/assistant.test.js` :
  * Mocker `state.js` et `storage.js` pour simuler le chargement des fiches, logs de combat et mode de jeu.
  * Valider mathématiquement la justesse de `cosineSimilarity(vecA, vecB)`.
  * Valider que `buildAiContext()` génère le contexte enrichi contenant les derniers événements de combat.

Merci pour ton travail de précision. Assure-toi que les 149+ tests passent et qu'aucune erreur de lint ne subsiste !
