# Prévisualisation Pages M0

Ce projet Pages sert le démonstrateur public en lecture seule. Il lit l'article et son image via les mêmes handlers D1/KV que le banc local. L'accueil et sa feuille de styles sont servis directement. Les URL admin et les API privées restent fermées, y compris les routes de connexion, d'upload et de publication. Les données de test doivent être fictives.

## Vérification locale

Depuis `prototypes/m0-pages` sous Windows, lancer `pnpm install --frozen-lockfile`, puis `pwsh -NoProfile -File ./ci-check.ps1`. La suite crée les données dans le banc local, les restaure dans une cible D1/KV neuve, puis fait compiler et servir cet artefact Pages par Wrangler. Le test vérifie le marqueur d'invocation, le HTML, le SHA-256 du média, `noindex` et le refus des routes privées.

Wrangler Pages 4.150.0 reçoit `--d1 DB=…` et `--kv IMAGES=…` lors de l'essai local. Les valeurs du `wrangler.jsonc` sont les identifiants fictifs du banc, à remplacer pour une future preview autorisée par des bindings réservés à ce projet.

## Avant toute création de ressources

- Se connecter au compte Cloudflare voulu et confirmer dans le tableau de bord le plan **Workers Free** et les conditions d'activation sans carte, abonnement payant ou essai. Les conditions publiques ont été vérifiées, mais le compte n'a pas été inspecté. [Workers](https://www.cloudflare.com/products/workers/), [Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [KV](https://developers.cloudflare.com/kv/platform/pricing/).
- Préparer un projet Pages isolé, une base D1 et un namespace KV propres à la preview. Importer des révisions et médias fictifs uniquement. Contrôler le réglage **Fail closed** et l'en-tête `noindex` sur l'URL effective. Suivre le [plan M0](../../../docs/M0.md#vérifications-avant-et-pendant-la-preview).
- Commencer par vérifier le rendu public, le routage et les métriques avec cet artefact. L'ouverture de l'écriture en preview nécessite un incrément séparé pour l'origine WebAuthn, la réauthentification, les limites de débit et de corps et la revue de l'outillage. Les avis sur Undici via Wrangler/Miniflare restent à traiter avant cette exposition.
