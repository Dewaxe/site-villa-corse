# État du projet

**10/11/2026 — M0, prototype local en cours.**

- **Prochaine tâche** — Tester la connexion seule derrière un filtre d’entrée sur Cloudflare et relever son CPU. Évaluer un décodeur WebP maintenu dans Wrangler avant un essai distant d’upload. Voir le [plan M0](M0.md#vérifications-avant-et-pendant-la-preview).
- **Décisions** — [ADR-001](DECISIONS.md#adr-001--hébergement-et-stack-full-stack) propose Pages + Functions + D1 + KV. IONOS reste le DNS autoritatif. La stack et le routage de production attendent les preuves du prototype.
- **Vérifié** — Routage Pages et refus admin. Deux comptes WebAuthn dans Edge avec clés virtuelles, rejeu refusé, récupération et révocation testées. Cycle article WebP et restauration D1/KV vérifiés en local. Une rafale sur un compte laisse l’autre disponible. Edge refuse un WebP tronqué qui passe le filtre structurel. [Preuves du banc](../prototypes/m0-pages/benchmarks/session/README.md) et [ADR-003](DECISIONS.md#adr-003--photosversionsstocks-kv-ouvert). Orthophoto IGN et repli vérifiés dans Edge.
- **À valider** — Réenrôlement après perte des deux clés, appareils physiques, CPU, validation complète du bitstream, sauvegarde hébergée et retour de déploiement, carte sur appareils physiques, comportement en cas de quota épuisé. Le sous-domaine reste à choisir.
- **Prévisualisation** — Workers Free confirmé par William. [Preview Pages en lecture seule](https://m0-preview.m0-villa-corse-d651ac5b.pages.dev/) vérifiée en HTTPS avec D1/KV dédiés, Fail closed configuré et traces d’invocation contrôlées. Simulation d’épuisement, métriques CPU et retour de code restent à vérifier.
- **Suivi** — Le [prototype M0](https://github.com/Dewaxe/site-villa-corse/tree/m0/routage-pages) est sur une branche dédiée. La décision de faisabilité est suivie dans « Site Villa Corse — Pilotage ». Les liens Notion privés restent hors dépôt public.
