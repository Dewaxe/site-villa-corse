# Banc local de dérivation de mot de passe

Depuis `prototypes/m0-pages`, avec les dépendances verrouillées installées, lancer dans deux terminaux :

```powershell
$env:WRANGLER_SEND_METRICS = 'false'
pnpm exec wrangler dev --local --config benchmarks/kdf/wrangler.jsonc
```

```powershell
node benchmarks/kdf/measure.js
```

Le Worker d’essai écoute sur `127.0.0.1:8789` et utilise uniquement des données fictives. Il est séparé de l’artefact Pages et ne doit pas être déployé. Le client effectue un échauffement puis dix requêtes séquentielles par cas. Il mesure depuis l’envoi de la requête jusqu’à la lecture de la réponse.

| Cas | Médiane HTTP locale | Maximum |
| --- | ---: | ---: |
| Témoin sans dérivation | 4,4 ms | 44,2 ms |
| PBKDF2-HMAC-SHA256, 600 000 itérations | 345,2 ms | 382,9 ms |
| scrypt, N=32768, r=8, p=3 | 189,7 ms | 198,7 ms |

Mesures du 10/11/2026 sous Windows, Node 24.22.1 et Wrangler 4.150.0. La latence inclut le serveur HTTP et l’ordonnancement. Le maximum du témoin illustre ce bruit. Les 10 ms du plan Workers Free s’appliquent au CPU par requête. Une mesure dans le runtime Cloudflare est nécessaire pour valider cette limite. Voir [ADR-004](../../../../docs/DECISIONS.md#adr-004--authentificationnotifications-ouvert).
