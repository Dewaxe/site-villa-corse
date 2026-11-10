# Essai local IGN à Cargèse

Depuis `prototypes/m0-pages`, installer les dépendances verrouillées et exécuter avec Edge installé :

```powershell
pnpm install --frozen-lockfile
node benchmarks/ign/check.js
node benchmarks/ign/check.js --live
```

Le test démarre un serveur HTTP sur la boucle locale. Le premier mode remplace les réponses IGN par une tuile fictive. Le mode `--live` lit directement le service IGN public. Les deux modes bloquent d'abord les tuiles pour vérifier le repli à froid. Pour enregistrer les captures, renseigner `M0_IGN_SCREENSHOTS` avec un dossier d'artefacts hors dépôt.

## Résultats du 10/11/2026

- Le [GetCapabilities](https://data.geopf.fr/wmts?SERVICE=WMTS&VERSION=1.0.0&REQUEST=GetCapabilities) annonce la couche `ORTHOIMAGERY.ORTHOPHOTOS`, le style `normal`, le format JPEG et la grille `PM_0_19`. Deux requêtes HTTP centrales ont renvoyé un JPEG avec le statut 200, au zoom 15 (colonne 17166, ligne 12147) et au zoom 17 (colonne 68665, ligne 48589).
- Edge a décodé neuf tuiles réelles de 256 × 256 par vue à chacun des deux zooms, sur des fenêtres de 1280 et 375 px. Le test utilise Tab et Entrée pour activer le fond. Le tracé suit la projection des tuiles, la source et la licence sont visibles, et le repli ne déborde pas de la fenêtre.
- Avant activation, le schéma fonctionne sans requête IGN. Si une tuile échoue ou si le fond dépasse le délai de six secondes, le schéma, le tracé et sa description restent disponibles. Aucun média IGN n'est stocké dans Git.

Le crédit cite IGN et BD ORTHO®, renvoie vers la [fiche de données et sa licence](https://www.data.gouv.fr/datasets/bd-ortho-r) et vers les dates de prise de vue indiquées par la couche. Le tracé est fictif. Il faudra vérifier le tracé réel, la date des clichés pertinents et la carte interactive sur appareils physiques au jalon cartographique.
