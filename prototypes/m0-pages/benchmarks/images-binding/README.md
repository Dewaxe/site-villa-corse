# Banc Cloudflare Images M0

Ce Worker de service réencode le WebP via le binding Images. Il applique le filtre VP8 et les limites de 250 000 octets et 1 600 pixels par côté à l’entrée et à la sortie. Il ne stocke rien. Les URL publiques Workers et de preview sont désactivées dans sa configuration. Le parcours administrateur du prototype reste séparé du banc.

## Reproduire en local

Depuis `prototypes/m0-pages`, avec Edge installé :

```powershell
node benchmarks/webp-decoder/fixtures.js
pnpm exec wrangler dev --local --config benchmarks/images-binding/wrangler.jsonc --ip 127.0.0.1 --port 8795
```

Dans un second terminal, lancer `node benchmarks/images-binding/check.js`.

## Résultat

L’émulateur a produit un WebP de 20 468 octets, décodable dans Edge à 320 × 320. Le conteneur tronqué a reçu 503, le faux MIME 400 et le corps trop grand 413. La grande image est refusée à la sortie avec 422. Un diagnostic local a mesuré un dérivé de 679 778 octets, au-dessus de 250 000. Wrangler documente une émulation de fidélité réduite. Ce poids ne prédit pas le résultat hébergé. Les injections de panne et de quota dans le binding simulé renvoient 503. [Émulation locale Images](https://developers.cloudflare.com/images/optimization/binding/#interact-with-your-images-binding-locally)

Le jeton Wrangler a reçu HTTP 403 en lecture des souscriptions et statistiques Images. L’essai hébergé attend la confirmation de l’offre Images Free sans carte sur le compte. Il devra vérifier le relais Pages, le dérivé et le CPU hébergés, puis la conservation de la version déjà publiée lors d’une panne.
