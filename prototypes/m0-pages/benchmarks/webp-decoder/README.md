# Banc de décodage WebP M0

Le Worker local combine le filtre VP8 et le décodage intégral des pixels par [image-webp 0.2.4](https://docs.rs/image-webp/0.2.4/image_webp/), compilé en WebAssembly. Les limites sont de 250 000 octets et 1 600 pixels par côté. Ce banc ne stocke aucun fichier et reste séparé de la publication.

Depuis `prototypes/m0-pages`, avec Rust et la cible `wasm32-unknown-unknown` disponibles :

```powershell
$env:CARGO_TARGET_DIR = Join-Path (Get-Location) '.wrangler/webp-decoder'
cargo build --locked --release --target wasm32-unknown-unknown --manifest-path benchmarks/webp-decoder/Cargo.toml
pnpm exec wrangler dev --local --config benchmarks/webp-decoder/wrangler.jsonc --ip 127.0.0.1 --port 8794
```

Dans un second terminal, lancer `node benchmarks/webp-decoder/check.js` avec Edge installé. Le relevé utilise Rust 1.99.1 et Wrangler 4.150.0. Le binaire de 200 532 octets reste dans `.wrangler`, ignoré par Git.

Les images de 64 × 64 et 1 600 × 1 600 (156 et 20 020 octets) renvoient 204. Leurs versions tronquées passent le filtre structurel et renvoient 422 au décodage. Le faux MIME renvoie 400 et un corps de 250 001 octets renvoie 413.

Avant un essai distant, vérifier les avis de sécurité de la chaîne Rust et limiter l’accès à des fichiers fictifs connus. Mesurer le CPU Cloudflare, notamment avec une image proche du plafond d’octets. [WebAssembly sur Workers](https://developers.cloudflare.com/workers/runtime-apis/webassembly/javascript/)


## Mesurer sur la preview

Compiler le module comme pour le banc local, puis lancer `node benchmarks/webp-decoder/fixtures.js` pour générer les deux images fictives dans `.wrangler/webp-decoder/fixtures`. Les images sont embarquées dans le bundle Functions, hors du dossier public.

Depuis `prototypes/m0-pages`, déployer `public` avec `--cwd benchmarks/webp-decoder/remote` sur une branche dédiée du projet de test. La preview exige `nodejs_compat`, `fail_open: false`, l’origine exacte `PROBE_ORIGIN`, un secret `PROBE_TOKEN` de 32 octets en Base64URL et une expiration `PROBE_UNTIL` en millisecondes Unix. Exécuter ensuite `node benchmarks/webp-decoder/remote-check.js` avec le jeton et l’origine en mémoire. Le test sépare les deux lots et produit leurs fenêtres UTC pour GraphQL.

La Function reçoit uniquement des GET sans image envoyée par le client. Elle choisit un fichier embarqué, appelle le décodeur et renvoie son statut. La mesure comprend le filtre d’accès, la préparation en mémoire, le filtre VP8 et le décodage. Les écritures en stockage et le traitement multipart de l’upload sont hors de ce banc.

## Résultat de la preview du 10 novembre 2026

OSV ne renvoie aucun avis pour les trois versions du verrou Cargo. La branche de preview dédiée a utilisé un secret de trois minutes et deux images synthétiques embarquées. Les appels sans jeton et les POST ont reçu 404. Les deux lots de huit GET autorisés ont renvoyé 204. L’API Pages confirme la preview et zéro déploiement de production.

| Image | Taille | Appels | CPU relevé |
| --- | ---: | ---: | --- |
| 320 × 320 | 21 790 octets | 8 | Médiane 9,713 ms, p95 25,371 ms |
| 1 600 × 1 600 | 235 254 octets | 8 | Médianes par seconde 101,984 à 184,801 ms, p95 le plus haut 213,465 ms |

GraphQL regroupé par seconde donne huit invocations à 21:40:30 UTC pour la petite image. Il en donne une, cinq et deux de 21:40:32 à 21:40:34 pour la grande. Intervalle d’échantillonnage de 1 et script indiqué comme `__unknown__`. Le rapprochement repose sur les créneaux et les volumes. Le p95 de 213,465 ms est celui d’un groupe de cinq appels, sans percentile recalculé sur les huit.

Les réponses réussies ne suffisent pas à qualifier le budget de 10 ms. Le décodage intégral avec cette implémentation dépasse ce budget dès la petite image au p95. Comparer une validation hors requête à un décodeur ou à des limites d’image différents avant d’ouvrir l’upload. [Limites Workers](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)
