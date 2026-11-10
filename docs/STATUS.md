# État du projet

**10/11/2026 — M0, prototype local en cours.**

- **Prochaine tâche** — Tester une clé de secours et la révocation d’une clé perdue, puis poursuivre le cycle image/article dans le prototype local. Voir [ADR-004](DECISIONS.md#adr-004--authentificationnotifications-ouvert).
- **Décisions** — [ADR-001](DECISIONS.md#adr-001--hébergement-et-stack-full-stack) propose Pages + Functions + D1 + KV. IONOS reste le DNS autoritatif. La stack et le routage de production attendent les preuves du prototype.
- **Vérifié** — Le cadrage est publié sur [GitHub](https://github.com/Dewaxe/site-villa-corse/tree/main). Sur `m0/routage-pages`, trois tests HTTP/artefact réussissent avec Wrangler local. Le témoin dynamique est marqué, l’accueil et le CSS sont servis sans marqueur, et les routes admin testées renvoient 403. Le banc KDF local mesure des médianes HTTP de 345,2 ms (PBKDF2) et 189,7 ms (scrypt), pour 4,4 ms au témoin. Le banc WebAuthn synthétique accepte deux identités, refuse le rejeu local et mesure 5,6 ms de latence HTTP médiane. Dans Edge avec authentificateurs virtuels, deux comptes passent le parcours WebAuthn/D1, y compris le refus du rejeu, la rotation et la révocation. Le CPU en preview reste à mesurer.
- **À valider** — Authentification et CPU, médias, publication et restauration, IGN, CI, compte Free et réglage Fail closed en preview. Le sous-domaine reste à choisir.
- **Suivi** — Le [prototype local](../prototypes/m0-pages/README.md) est isolé sur sa branche. La décision de faisabilité est suivie dans « Site Villa Corse — Pilotage ». Les liens Notion privés restent hors dépôt public.
