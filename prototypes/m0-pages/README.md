# Prototype M0 — Routage Pages Functions

Depuis ce dossier, installer les dépendances avec `pnpm install --frozen-lockfile`, puis lancer `pnpm dev`. Dans un autre terminal, exécuter `pnpm test`.

`public/` est l’artefact statique utilisé par Wrangler. Son `_routes.json` couvre uniquement le témoin dynamique et l’administration de démonstration. Le middleware global ajoute `X-M0-Invoked: 1` aux réponses qui traversent les Functions. Les réponses statiques se vérifient avec leur contenu et l’absence de ce marqueur.

L’administration refuse toutes les requêtes à cette étape. Le test local couvre l’artefact et les réponses HTTP. Les métriques d’invocation et le réglage Fail closed de la plateforme devront être vérifiés en preview.

## Suite reproductible

Sur Windows avec Edge installé, lancer depuis ce dossier :

```powershell
pnpm install --frozen-lockfile
pwsh -NoProfile -File ./ci-check.ps1
```

La suite vérifie le routage Pages, les sessions et la récupération WebAuthn dans Edge, le cycle de publication avec D1/KV, l’export/import dans une cible neuve et le repli cartographique avec des tuiles simulées. Elle crée ses invitations et ses données fictives dans des dossiers isolés ignorés par Git. Elle utilise les ports de boucle locale 8788 et 8791.

Le workflow GitHub Actions reprend la même commande avec Node et pnpm épinglés. Les mesures CPU, les appareils physiques et le service IGN réel restent des essais séparés.
