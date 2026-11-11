# Prévisualisation Pages M0

Ce projet Pages sert le démonstrateur public en lecture seule. Il lit l'article et son image via les mêmes handlers D1/KV que le banc local. L'accueil et sa feuille de styles sont servis directement. Les URL admin et les API privées restent fermées, y compris les routes de connexion, d'upload et de publication. Les données de test doivent être fictives.

## Vérification locale

Depuis `prototypes/m0-pages` sous Windows, lancer `pnpm install --frozen-lockfile`, puis `pwsh -NoProfile -File ./ci-check.ps1`. La suite crée les données dans le banc local, les restaure dans une cible D1/KV neuve, puis fait compiler et servir cet artefact Pages par Wrangler. Le test vérifie le marqueur d'invocation, le HTML, le SHA-256 du média, `noindex` et le refus des routes privées.

Wrangler Pages 4.150.0 reçoit `--d1 DB=…` et `--kv IMAGES=…` lors de l'essai local. Les valeurs du `wrangler.jsonc` sont les identifiants fictifs du banc, à remplacer pour une future preview autorisée par des bindings réservés à ce projet.

## Avant toute création de ressources

- Se connecter au compte Cloudflare voulu et confirmer dans le tableau de bord le plan **Workers Free** et les conditions d'activation sans carte, abonnement payant ou essai. Pour la première preview, voir le contrôle du compte dans le journal de preuve. [Workers](https://www.cloudflare.com/products/workers/), [Pages Functions](https://developers.cloudflare.com/pages/functions/pricing/), [D1](https://developers.cloudflare.com/d1/platform/pricing/), [KV](https://developers.cloudflare.com/kv/platform/pricing/).
- Préparer un projet Pages isolé, une base D1 et un namespace KV propres à la preview. Importer des révisions et médias fictifs uniquement. Contrôler le réglage **Fail closed** et l'en-tête `noindex` sur l'URL effective. Suivre le [plan M0](../../../docs/M0.md#vérifications-avant-et-pendant-la-preview).
- Commencer par vérifier le rendu public, le routage et les métriques avec cet artefact. L'ouverture de l'écriture en preview nécessite un incrément séparé pour l'origine WebAuthn, la réauthentification, les limites de débit et de corps et la revue de l'outillage. Les avis précédents sur Undici via Miniflare ont été traités dans le lockfile du banc local.

## Déploiement de preuve du 10/11/2026

L’artefact du commit `f4720b7` a été chargé par Direct Upload dans le projet dédié `m0-villa-corse-d651ac5b`, sur la branche `m0-preview`. [Alias de preview](https://m0-preview.m0-villa-corse-d651ac5b.pages.dev/) · [Déploiement vérifié](https://550f51b8.m0-villa-corse-d651ac5b.pages.dev/).

- Workers Free a été confirmé par William. Le contrôle de facturation n'est pas accessible via les autorisations OAuth utilisées par Wrangler.
- Les bindings de preview lisent deux révisions et deux images fictives. L'API Pages confirme `fail_open: false` et zéro déploiement de production. Cloudflare impose la même valeur de `fail_open` pour la preview et la production de ce projet isolé.
- Le test HTTPS compare le HTML, le SHA-256 des images, `noindex` et les refus 403. Pages Tail a reçu les trois requêtes dynamiques marquées et aucune trace pour les deux ressources statiques marquées. Le quota n'a pas été épuisé et ces traces ne mesurent pas le CPU de la connexion ou de l'upload.

Pour rejouer le test depuis `prototypes/m0-pages` avec le manifeste fictif de l'exercice local :

```powershell
$env:M0_PAGES_ORIGIN = 'https://550f51b8.m0-villa-corse-d651ac5b.pages.dev'
node preview/check.js exercice-m0
Remove-Item Env:M0_PAGES_ORIGIN
```

Cloudflare ne propose le rollback natif que pour la production. Sur ce projet de preview, la preuve de retour de code consistera à redéployer l'artefact antérieur. [Rollback Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/).


## Simulation T-062 du refus d’invocation

Le 11 novembre 2026, l’API Cloudflare a confirmé `fail_open: false` dans les configurations Preview des deux projets Pages M0. Pages Functions et Workers partagent 100 000 requêtes par jour sur Workers Free, réinitialisées à minuit UTC. [Routage Pages](https://developers.cloudflare.com/pages/functions/routing/) · [Quota partagé](https://developers.cloudflare.com/pages/functions/pricing/)

Dans `ci-check.ps1`, Edge simule un refus 503 avant le handler sur les routes Functions de `_routes.json` de la preview en lecture seule. Les huit requêtes portent un cookie de session valide. Elles couvrent session, administration, brouillon, publication, article et média. Le JavaScript statique reçoit 200. Après rétablissement, la liste des révisions et le pointeur publié sont identiques.

Le 503 est celui du simulateur. Le quota réel n’a pas été épuisé.


## Retour à une version précédente en preview

Le 11 novembre 2026, l’alias dédié `m0-rollback` a servi successivement [A](https://6b5c296b.m0-villa-corse-d651ac5b.pages.dev/), [B](https://fe1d86ee.m0-villa-corse-d651ac5b.pages.dev/) et [A restauré](https://e7ded5a1.m0-villa-corse-d651ac5b.pages.dev/). A reprend l’artefact de preuve conservé de `f4720b7`. B est une variante de test qui ajoute un commentaire HTML et un en-tête de Function. Le second envoi de A reprend les octets d’origine des deux fichiers.

À chaque étape, `preview/check.js exercice-m0` vérifie le HTML, l’image par SHA-256, les fichiers statiques et le refus des routes admin. Les marqueurs ont suivi la séquence absent, présent, absent. L’API a confirmé les trois déploiements en preview, zéro déploiement de production et Fail closed actif. L’accueil de l’alias initial était identique avant et après.

Le test valide le redéploiement du code conservé sur un alias Preview. Les trois déploiements utilisent les mêmes données fictives D1/KV. La restauration de données reste un exercice distinct. [Rollback Pages](https://developers.cloudflare.com/pages/configuration/rollbacks/)
