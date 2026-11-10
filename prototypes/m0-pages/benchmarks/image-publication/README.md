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


## Transfert privé vérifié sur GitHub Actions

Le [workflow de preuve](https://github.com/Dewaxe/site-villa-corse/actions/runs/42910306347) a compilé le décodeur Wasm verrouillé sur un runner standard Ubuntu. Il a récupéré une image fictive via une route Pages authentifiée, décodé ses pixels en mémoire et renvoyé son SHA-256 deux fois. D1 a confirmé le résultat. Le contrôle sans jeton a reçu 404.

Le workflow est déclenché par le push du fichier de workflow pour cet essai. La route de retour vérifie l’empreinte attendue d’un seul fichier embarqué et met un témoin D1 à 1. Le résultat rejoué n’apporte aucune écriture supplémentaire. Ce témoin reste séparé de la publication d’articles.

Aucun artefact GitHub n’a été créé. Les journaux contiennent le résultat synthétique du test. Une recherche du préfixe Base64 de 80 caractères de l’image n’y trouve aucune correspondance. Le script ne journalise ni les octets ni le jeton. Le secret GitHub temporaire et la variable d’origine ont ensuite été supprimés, avec 404 vérifié sur leurs lectures. Le relais expire automatiquement après quinze minutes. Les images de cette preuve sont fictives et embarquées dans le bundle hors du répertoire public.

Pour reproduire, générer le fichier du [banc WebP](../webp-decoder/README.md), compiler le Wasm, préparer une preview à durée limitée avec la base D1 de test et `TRANSFER_DIGEST` égal au SHA-256 de l’image. La table `m0_transfer` contient une ligne `(id=1, completed=0)`. Définir le secret GitHub `M0_TRANSFER_TOKEN` et la variable `M0_TRANSFER_ORIGIN` avant de déclencher le workflow. Les entrées restent en mémoire dans le runner. Retirer les deux paramètres après l’essai.

La validation peut donc être exécutée sur GitHub avec retour privé vers Pages. Restent à faire le déclenchement depuis le bouton admin, le stockage privé transitoire par révision, le réencodage et la publication D1/KV complète. Une autorisation GitHub adaptée au déclenchement devra être configurée explicitement avant ce raccordement.
