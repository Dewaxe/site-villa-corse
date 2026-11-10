# État du projet

**10/11/2026 — M0, prototype local en cours.**

- **Prochaine tâche** — Examiner le parcours WebAuthn complet avec D1 et répéter la mesure sur un lot plus grand. Tester les appareils physiques et qualifier un décodeur WebP avant l’upload distant.
- **Décisions** — [ADR-001](DECISIONS.md#adr-001--hébergement-et-stack-full-stack) propose Pages + Functions + D1 + KV. IONOS reste le DNS autoritatif. La stack et le routage de production attendent les preuves du prototype.
- **Vérifié** — Routage Pages et refus admin. Deux comptes WebAuthn dans Edge avec clés virtuelles, rejeu refusé, récupération et révocation testées. Cycle article WebP et restauration D1/KV vérifiés en local. Une rafale sur un compte laisse l’autre disponible. Edge refuse un WebP tronqué qui passe le filtre structurel. [Preuves du banc](../prototypes/m0-pages/benchmarks/session/README.md) et [ADR-003](DECISIONS.md#adr-003--photosversionsstocks-kv-ouvert). Orthophoto IGN et repli vérifiés dans Edge.
- **À valider** — Réenrôlement après perte des deux clés, appareils physiques, marge CPU WebAuthn, CPU d’upload et décodage WebP complet, sauvegarde hébergée et retour de déploiement, carte sur appareils physiques, comportement en cas de quota épuisé. Le sous-domaine reste à choisir.
- **Prévisualisation** — Workers Free confirmé par William. [Preview Pages en lecture seule](https://m0-preview.m0-villa-corse-d651ac5b.pages.dev/) vérifiée en HTTPS avec D1/KV dédiés, Fail closed configuré et traces d’invocation contrôlées. Le [banc HTTPS](../prototypes/m0-pages/auth-preview/README.md#mesure-séparée-des-phases) passe. La marge CPU reste à établir sur les vérifications WebAuthn. Simulation d’épuisement et retour de code restent à vérifier.
- **Suivi** — Le [prototype M0](https://github.com/Dewaxe/site-villa-corse/tree/m0/routage-pages) est sur une branche dédiée. La décision de faisabilité est suivie dans « Site Villa Corse — Pilotage ». Les liens Notion privés restent hors dépôt public.
