# Notion ↔ GitHub ↔ Codex — contrat de synchronisation

**Objectif confirmé :** Codex doit alimenter Notion de manière spontanée au fil du travail. William ne veut pas répéter après chaque fonctionnalité « mets à jour Notion et ajoute les apprentissages ». Il souhaite un suivi agréable en parallèle du README et des documents Git.

## Espace existant (déjà créé)

- Tableau de bord privé : **Site Villa Corse — Pilotage**.
- Base : **Backlog — Fonctionnalités**.
- Base : **Apprentissages — Compétences**.
- Base : **Décisions — Architecture**.
- Base : **Jalons — Livraisons**.

Ces quatre bases et des vues du tableau de bord existent. L'accès **en lecture** depuis Codex Windows a été testé par William. **Vérifier séparément les permissions d'écriture** avec une opération test réversible et approuvée ; ne pas inférer l'écriture du seul fait de voir les noms. Rechercher les bases par leurs noms dans le connecteur autorisé et conserver toute configuration technique locale **hors dépôt public** ; ne pas publier les URLs internes du workspace Notion.

## Sources de vérité

| Objet | Source canonique | Représentation ailleurs |
| --- | --- | --- |
| Code, historique, tests, configurations | GitHub | Liens et statuts Notion |
| Tâches d'implémentation/PR | GitHub Issues et PR dès leur création | Cartes Backlog Notion par référence GitHub |
| Vision produit et décisions durables | Documents du dépôt / ADR | Résumé, statut, discussion et liens dans Décisions |
| Avancement lisible / activités | Notion | Liens vers issues et commits |
| Compétences / réflexions pédagogiques | Notion | Résumé dans PR et éventuellement `docs/LEARNING.md` |
| État des livraisons | Git tags / déploiements réels | Jalons et preuves dans Notion |

Ne **jamais** recopier les mots de passe, accès, avis en attente ou informations privées non nécessaires dans Notion.

## Schéma logique d'une tâche

**Clé externe stable :** `repo + numéro d'issue GitHub`. Une tâche Notion possède un lien d'issue, une phase, priorité, propriétaire responsable, statut et critères d'acceptation ; ajouter lien PR/déploiement après coup. Réutiliser la page existante par recherche avant création afin d'éviter les doublons. Les noms de propriétés réels doivent être lus depuis Notion au moment de connecter ; ne pas en inventer.

### Correspondance de statut proposée

| GitHub / réalité | Notion |
| --- | --- |
| Issue préparée | Prête |
| Travail entamé | En cours |
| PR ouverte / CI en cours | Revue/Tests |
| CI verte mais accord humain attendu | À valider |
| PR fusionnée + critères vérifiés | Terminée côté développement |
| Déploiement production vérifié | Livrée (dans Jalons/état de livraison) |
| CI échoue / permission manquante | Bloquée ou suivi manuel avec raison |

Les statuts doivent être adaptés aux options effectivement présentes dans la base ; le vocabulaire ci-dessus est le contrat logique, pas une garantie de noms exacts.

## Événements qui **déclenchent automatiquement Codex**

1. **Démarrage de tâche** : retrouver la page Backlog, renseigner statut, lien issue et objectif, sans modifier les choix de l'utilisateur.
2. **Nouvelle décision structurante** : enregistrer un ADR dans `DECISIONS.md` et son résumé/lien/état dans Décisions Notion.
3. **Après tests/PR** : renseigner les liens, preuves, échecs éventuels et état exact. Ne pas indiquer « tests passés » sur simple intuition.
4. **Après consolidation pédagogique** : une nouvelle entrée ou mise à jour de compétence avec notion, preuve Git et niveau réellement constaté ; ne pas créer 12 fiches génériques par PR.
5. **Publication/rollback** : mettre à jour Jalons avec URL d'environnement, révision, date, validation et incidents.
6. **Rétrospective** : court bilan humain et liens vers les changements, blocages et apprentissages.

La mise à jour fait partie de la **checklist normale de Codex**, donc William n'a pas à la demander. Regrouper les écritures pour limiter le bruit et la consommation API ; traiter conflits et doublons.

## Automatisme réaliste : deux niveaux

**Niveau 1 — dès le début :** lorsque Codex travaille et que le plugin Notion fournit des outils d'écriture, il réalise ces synchronisations dans le cadre de la tâche. C'est le comportement demandé par `AGENTS.md`. Un connecteur seulement activé ne garantit pas que l'agent soit en cours d'exécution ni que chaque mutation déclenche un événement.

**Niveau 2 — éventuellement :** si William veut un fonctionnement **indépendant de la session Codex** (ex. tâche fermée directement dans GitHub), développer un petit synchroniseur GitHub Actions → Notion API (événements issues/PR/deploy). Cela exige configuration explicite d'une intégration Notion autorisée, secrets GitHub chiffrés, mapping d'IDs, anti-doublons, journal d'échec, tests et gestion des permissions. **Ne pas créer de token ni installer d'intégration supplémentaire sans validation.** Les workflows Actions standard dans les dépôts publics ont généralement une offre gratuite, mais vérifier le paramétrage avant emploi.

Dans les deux cas, aucune « synchronisation automatique en continu » ne doit être promise avant un **test de bout en bout**.

## Résilience si Notion indisponible

- Ne pas supprimer ou refaire une tâche Notion faute de réponse.
- Conserver dans la PR une note de sync à reprendre (statut voulu, données et lien cible **sans informations personnelles**), prévenir William et réessayer au passage suivant une fois le service rétabli.
- Après rétablissement : relire la fiche, fusionner les changements sans écraser les modifications manuelles du propriétaire, conserver les éléments de preuve.
- Le code validé ne doit pas être faussement présenté comme « livré » si seul Notion a répondu.

## Test d'acceptation de l'intégration

Sur une issue de démonstration : créer une entrée ou sélectionner une entrée existante, démarrer la tâche, ouvrir PR, exécuter un test, renseigner un apprentissage réel, passer « à valider », valider, fusionner et vérifier Notion. Réexécuter la synchronisation sans doublon. Simuler une erreur de permissions. Capturer des preuves (liens d'issue, PR, fiches), sans secret. Évaluer ensuite si le niveau 2 est utile.
