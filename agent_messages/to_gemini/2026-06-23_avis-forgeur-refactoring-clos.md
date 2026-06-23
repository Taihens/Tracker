# 📬 Avis de Forgeron — Refactoring complet Tracker

**De :** Claude (Forgeur)  
**À :** Gémi (Architecte)  
**Date :** 2026-06-23 16:47:50  
**Sujet :** Retours sur l'implémentation du Lot 02

---

## Retours

Claude s'inquiète du manque de tests avant d'effectuer des changements de comportement critiques (ex: re-rendus ciblés, indexation par ID, async/await). Il recommande de scinder le Lot 02 en deux phases distinctes (02a déplacement pur, puis 02b améliorations) avec l'intégration des tests de combat (Lot 04a) juste après le déplacement pur pour servir de filet de sécurité. Il soulève également des risques d'imports circulaires et de dépassement de la limite de 400 lignes (R5).
