# Publication différée des images M0

Ce banc local modélise la validation en arrière-plan. SQLite en mémoire conserve la demande et la version publiée. Le décodeur WebP Wasm déjà testé produit une preuve associant l’identifiant de révision au SHA-256 des octets décodés. Le banc n’est accessible par aucun réseau. La preuve représente un résultat interne de confiance, sans mécanisme d’authentification dans ce modèle.

Une demande conserve la version publiée au moment du clic. À réception du résultat, le changement de pointeur et l’état du traitement sont enregistrés ensemble. Une demande ancienne ne peut écraser une version publiée entre-temps. Rejouer le même résultat conserve la même version.

Compiler le décodeur selon le [banc Wasm](../webp-decoder/README.md), puis depuis `prototypes/m0-pages` :

```powershell
node benchmarks/webp-decoder/fixtures.js
node benchmarks/image-publication/check.js
```

Le test vérifie le refus du VP8 tronqué qui passe le contrôle des en-têtes, une panne du validateur et sa reprise, un résultat portant l’empreinte d’un autre fichier, le rejeu et une demande devenue périmée.

Restent à prototyper le réencodage, le déclenchement GitHub Actions, les routes authentifiées de transfert et de retour du résultat, puis le raccordement D1/KV au clic de l’admin. Le banc valide les octets reçus et conserve ces mêmes octets en mémoire pour isoler les tests de publication.
