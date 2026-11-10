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
