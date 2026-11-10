# État du projet

**10/11/2026 — M0, prototype local en cours.**

- **Prochaine tâche** — Mesurer une KDF et vérifier la faisabilité de sessions admin sûres, puis réaliser l’upload WebP et le cycle article D1/KV sur données de démonstration. Voir le [plan M0](M0.md).
- **Décisions** — [ADR-001](DECISIONS.md#adr-001--hébergement-et-stack-full-stack) propose Pages + Functions + D1 + KV. IONOS reste le DNS autoritatif. La stack et le routage de production attendent les preuves du prototype.
- **Vérifié** — Le cadrage est publié sur [GitHub](https://github.com/Dewaxe/site-villa-corse/tree/main). Sur `m0/routage-pages`, trois tests HTTP/artefact réussissent avec Wrangler local. Le témoin dynamique est marqué, l’accueil et le CSS sont servis sans marqueur, et les routes admin testées renvoient 403.
- **À valider** — Authentification et CPU, médias, publication et restauration, IGN, CI, compte Free et réglage Fail closed en preview. Le sous-domaine reste à choisir.
- **Suivi** — Le [prototype local](../prototypes/m0-pages/README.md) est isolé sur sa branche. La décision de faisabilité est suivie dans « Site Villa Corse — Pilotage ». Les liens Notion privés restent hors dépôt public.
