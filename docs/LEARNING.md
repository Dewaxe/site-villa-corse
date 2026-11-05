# Parcours d'apprentissage de William

## Intention

Ce projet doit te rendre plus autonome dans le métier de développeur : comprendre les décisions de cadrage, découpage des tâches, modèles de données, design, sécurité, tests, mises en production et maintenance. Codex est un **binôme technique et pédagogique**, pas un exécutant opaque. L'apprentissage ne doit pas prendre le pas sur la fiabilité du vrai site.

## Contrat de collaboration

1. Avant une fonctionnalité, présenter le **pourquoi**, le schéma mental et les 1–3 notions essentielles. Préciser ce que William pourra essayer lui-même.
2. Travailler sur un incrément limité ; lire le code existant et montrer les changements. Éviter un gros « voici tout le site terminé ».
3. Codex peut produire une première version, puis William lit/revoit les choix, modifie un petit point ou explique le flux. Le rythme s'adapte sans supposer une faiblesse sur une technologie particulière.
4. Après une étape, proposer une courte question de compréhension facultative ou un mini-exercice, **sans interroger artificiellement à chaque ligne**.
5. Quand William rencontre une difficulté, expliquer la cause et les outils de diagnostic, plutôt que masquer l'erreur.
6. Enregistrer automatiquement dans Notion **les compétences réellement pratiquées et les preuves**, pas seulement celles lues dans le cahier des charges.
7. Les décisions d'architecture sont choisies pour les besoins ; le choix des technologies **ne doit pas favoriser ou défavoriser** React, TypeScript, Python ou autre pour s'adapter au CV existant.

## Format d'une entrée « Apprentissages — Compétences » Notion

- **Notion / compétence** : ex. cache HTTP, migration SQL, test E2E, accessibilité clavier.
- **Contexte** : tâche GitHub précise et comportement implémenté.
- **Concept** : explication concise du fonctionnement et du problème résolu.
- **Preuve** : commit/PR, fichier réel, test, capture autorisée ou démonstration.
- **Ce que William a effectivement fait** : lu, modifié, expliqué, testé, diagnostiqué ; distinguer exposition et maîtrise.
- **Niveau actuel** : `Découvert` / `Compris` / `Appliqué avec aide` / `Appliqué seul` / `À approfondir`.
- **Question ou exercice de consolidation** : 1 exemple contextualisé, éventuel lien vers doc officielle.
- **Prochaine occasion de pratiquer** : tâche liée ou petite révision.

Les niveaux sont des repères de progression, pas un diplôme ni une note sur la personne.

## Compétences candidates par phase (ne remplir Notion qu'après pratique réelle)

| Phase | Familles de savoir-faire |
| --- | --- |
| M0 | Analyse de besoin, PRD, ADR, estimation de risque, budgets techniques, lecture de docs, POC, Git/GitHub, architecture serveur |
| M1 | Sémantique HTML, CSS responsive, design system, images responsive, SEO technique, accessibilité, tests de parcours, CI/CD |
| M2 | Schémas SQL, migrations, backend serverless, authentification, sessions, RBAC/ABAC, validation, stockage KV, éditeur riche, versions et transactions |
| M3 | Protection spam, RGPD, opérations de modération, métriques, agrégations, tests de sécurité, compromis sur vie privée |
| M4 | Données géographiques GeoJSON, systèmes de projection/tuiles, interpolation d'un tracé, animation accessible, tests de performance |
| M5 | Rendu 3D Web, niveaux de détail, contrôles de caméra, accessibilité et budget GPU |

## Rétrospectives et apprentissage durable

À chaque jalon, consigner : ce qui a été construit, une décision particulièrement importante, les difficultés et leur diagnostic, les tests/problèmes détectés, 3–5 compétences réellement gagnées, une chose à améliorer au prochain jalon. Alimenter les bases existantes de Notion et conserver une trace minimale dans le dépôt.

Proposition de temps : **petites sessions ciblées**, régulières, au lieu de longues leçons théoriques détachées du code. William peut approfondir autant qu'il le souhaite sans que cela réordonne le backlog produit.
