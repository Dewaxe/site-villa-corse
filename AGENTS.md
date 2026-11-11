# AGENTS.md — Site Villa Corse

> Instructions de travail pour tout agent Codex opérant sur ce dépôt. Date de cadrage initial : 05/11/2026.

## Mission

Construire et maintenir un site vitrine professionnel en français pour une villa à Cargèse (Corse-du-Sud). Pas de réservation intégrée : redirection exclusive vers Amivac. L'expérience doit être excellente et testée sur ordinateurs **et** smartphones, sans préférence de méthode « mobile first ». Le projet a également une finalité d'apprentissage pour William.

Les fichiers `docs/PRODUCT.md`, `docs/DESIGN.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/QUALITY.md`, `docs/SECURITY.md`, `docs/LEGAL.md`, `docs/NOTION.md` et `docs/LEARNING.md` sont normatifs pour le projet. Les décisions actées sont dans `docs/DECISIONS.md`. Les inconnues sont marquées **À VALIDER** ; ne jamais les transformer en faits.

## Règles absolues

1. **Budget : 0 € sans risque de dépassement.** Ne créer ni n'activer un service payant, un abonnement avec facturation possible, une carte de paiement ou un produit susceptible de facturation automatique. Vérifier tarifs, quotas, conditions et éventuelle nécessité de carte sur les docs officielles avant chaque activation. En cas de doute, s'arrêter.

   **Confirmation permanente pour le compte Cloudflare du projet (William, 12/11/2026).** Le compte est sur Workers Free, sans facturation ni moyen de paiement. William ne renseignera jamais de moyen de paiement. Cette confirmation fait foi pour les opérations sur les ressources gratuites déjà en place et pour la clôture M0. Ne pas redemander cette confirmation, chercher un justificatif dans le tableau de bord ou bloquer une tâche pour ce motif. Pour un nouveau service ou une nouvelle activation, vérifier les conditions officielles. Écarter l’option si elle exige un moyen de paiement, un abonnement payant ou permet un dépassement facturé.
2. **Pas de plugin ChatGPT Sites.** Le code est développé dans un dépôt GitHub public, revu et déployé progressivement. Ne pas toucher aux projets existants sous `dempure.com` ou changer les serveurs DNS sans autorisation explicite.
3. **Pas de secrets ni données privées dans le dépôt public** : mots de passe, jetons, identifiants d'accès, téléphones ou e-mails privés non destinés à la publication, avis non validés, IP, backups et données personnelles.
4. **Sécurité et exactitude éditoriale** : piscine uniquement collective et réglementée (16 × 8 m), jamais « piscine privée » ; couchage salon = canapé convertible. Pas de promesses sans confirmation (conditions, temps de trajet, accessibilité, disponibilité, photos, droits).
5. **Prioriser les dépendances, la valeur, la réduction du risque et la qualité** — pas l'enthousiasme lié à une fonctionnalité. La visite 3D est tardive. Les essais de faisabilité risqués peuvent, eux, être précoces.
6. **Travail incrémental** : une tâche et un changement cohérent à la fois ; pas de refonte générale ni de génération intégrale de l'application sans cadrage et validation. Ne pas remplacer les choix par défaut de William pour aller plus vite.
7. **Explications pédagogiques** : justifier les décisions, montrer les principaux fichiers modifiés, les commandes, les résultats des tests et les compromis. Proposer à William une mini-vérification ou un exercice de compréhension après chaque étape importante. Ne pas infantiliser.
8. **Qualité vérifiable** : écrire/adapter les tests, exécuter la validation pertinente, ne pas déclarer « terminé » un travail non vérifié. Ne jamais affirmer avoir testé en navigateur si ce n'est pas le cas.
9. **Notion automatique** : si connecteur Notion accessible et autorisé, le solliciter spontanément aux transitions de tâche, aux décisions et après les apprentissages ; ne pas obliger William à répéter la consigne. Suivre `docs/NOTION.md` ; ne pas fabriquer de preuves ni marquer « terminé » si la CI ou la validation humaine attendue est absente.
10. **Autorité du propriétaire** : les deux administrateurs ont les mêmes droits applicatifs, mais toute action de publication, changement de DNS, création de service externe, changement de sécurité ou suppression de données doit suivre les confirmations requises. Les actions destructrices et migrations de production exigent une sauvegarde vérifiée.

## Rituel de chaque tâche

1. Avant de commencer, lire `AGENTS.md`, `docs/STATUS.md` et les documents pertinents. Examiner l'état réel de Git (branche, modifications locales, historique et remotes disponibles). Utiliser les fichiers et preuves du projet comme source de vérité, sans supposer avoir accès aux autres conversations. Identifier la tâche GitHub/Notion existante ou la créer après validation si absente. Décrire brièvement objectif, périmètre, risques, critères d'acceptation et notion technique à apprendre.
2. Pour une décision structurante, produire un ADR dans `docs/DECISIONS.md` (options, coût, risques, choix, preuve, date). Ne pas introduire de dépendance sans évaluer maintenance, sécurité, accessibilité et poids client.
3. Développer par petits changements lisibles, conserver l'existant et écrire tests/cas d'erreur. Git : branches ciblées, commits explicites, PR quand le dépôt est prêt ; ne pas forcer ni réécrire l'historique de l'utilisateur.
4. Vérifier format, types, lint, tests, build et parcours manuels selon `docs/QUALITY.md`. Tester desktop/mobile et clavier lorsqu'une interface change. Documenter ce qui n'a pas été testé.
5. Actualiser automatiquement `docs/STATUS.md` après chaque étape significative ou changement de décision. Résumer l'état et pointer vers les preuves, en distinguant résultats constatés, travaux prévus et validations attendues. Mettre à jour GitHub et Notion dans la même intervention selon `docs/NOTION.md` lorsque les connexions et autorisations le permettent. Consigner les apprentissages avec des exemples réels. Ne jamais inventer une validation, un test réussi ou une synchronisation.
6. Livrer un récapitulatif concret : résultat, preuves de test, limites, lien tâche/PR, apprentissages, prochaine action. Demander une validation utilisateur aux jalons, pas à chaque micro-édition.

## Définition de « terminé »

- Besoin et critères couverts ; tests pertinents réussis ; revues de sécurité/UX/accessibilité considérées ; build sans erreur ; documentation et Notion à jour ; pas de régression connue.
- Une tâche « prête pour validation » n'est pas « terminée » tant que la validation humaine définie dans son critère d'acceptation manque.
- Les déploiements de production se font sur décision explicite, avec contrôle du fonctionnement et possibilité de retour arrière.

## Première tâche obligatoire (M0)

Ne pas commencer directement le design ou coder la galerie. Vérifier officiellement la faisabilité **Cloudflare Pages + Pages Functions + D1 + Workers KV** sur offre gratuite, le déploiement du sous-domaine depuis DNS IONOS, un upload d'image optimisée, un contenu dynamique rendu/indexable, une authentification admin de démonstration sûre et l'absence de facturation. Comparer au moins une alternative. Conserver un prototype minimal supprimable et un ADR avant de figer la stack. Voir `docs/ARCHITECTURE.md` et `docs/ROADMAP.md`.
