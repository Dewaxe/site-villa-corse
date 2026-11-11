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


## Demande et réencodage automatiques en local

`node benchmarks/image-publication/pipeline-check.js` lance un serveur HTTP sur une adresse locale avec des secrets aléatoires distincts pour le rôle admin et le traitement. Une seule demande POST déclenche le transfert, le réencodage Sharp 0.35.5 et le retour du dérivé. SQLite associe les empreintes du source et du résultat avant de changer le pointeur publié dans la même transaction.

Le test constate une publication après une seule demande, un dérivé distinct et borné à 250 000 octets, le refus du téléchargement anonyme et d’un résultat dont les empreintes sont fausses. Le fichier VP8 tronqué provoque un échec du traitement et laisse la révision précédente publiée. Le banc précédent continue de vérifier le rejeu et les résultats périmés. `pnpm audit` ne signale aucun avis connu après l’ajout verrouillé de Sharp.

Sharp décode avec `failOn: warning` et une limite de 2,56 millions de pixels, puis réencode en WebP à qualité 55, sans demande de conservation des métadonnées. Le filtre structurel vérifie aussi le dérivé. Ce réglage est provisoire. [Options Sharp](https://sharp.pixelplumbing.com/api-constructor/)

Le déclenchement du traitement est injecté dans le serveur local. Le workflow GitHub prouvé précédemment reste déclenché par un push. Le raccordement au bouton de l’admin réel, la délégation GitHub limitée et le stockage D1/KV par révision restent à réaliser.


## Demandes persistantes avec le schéma D1

`node benchmarks/image-publication/storage-check.js` exécute les handlers article réels sur SQLite avec les migrations D1 et un KV simulé. La migration `0005_publication_jobs.sql` conserve une demande unique par brouillon et version publiée. La méthode de publication accepte un déclencheur injecté pour ce banc. Le raccordement du Worker WebAuthn au déclencheur GitHub reste à implémenter.

Le test confirme le maintien de la demande après un échec de déclenchement, le réencodage du fichier récupéré par identifiant de demande, le stockage du dérivé sous une clé immuable liée à son empreinte, puis le changement atomique du pointeur publié. Le résultat crée une nouvelle révision, ce qui préserve les octets du brouillon et les médias déjà publiés.

La panne d’écriture KV, la mauvaise empreinte du source, le résultat rejoué et une version devenue périmée sont vérifiés. Le média du brouillon répond 404 avant publication. La sauvegarde exporte la clé effective du dérivé et la restauration le remet sous sa clé d’article standard. La suite Wrangler vérifie aussi les données du parcours existant.


## Déclenchement et retour de résultat

En mode `PUBLICATION_MODE=queued`, le Worker admin enregistre la demande avant d’appeler GitHub. Le navigateur interroge son état après le clic. Le workflow reçoit uniquement un identifiant opaque. Il récupère le WebP privé via un jeton de traitement et renvoie le dérivé, avec l’empreinte du fichier source. Le serveur vérifie l’association à la demande et le format du dérivé avant publication.

Les tests locaux couvrent le contenu du déclenchement, l’absence d’accès anonyme, le retour authentifié et son rejeu. [Déclenchement de contrôle](https://github.com/Dewaxe/site-villa-corse/actions/runs/42912218152) accepté sur la branche M0, sans exécution du traitement dans ce contrôle.

Pour la prochaine preview, prévoir deux autorisations distinctes. `GITHUB_DISPATCH_TOKEN` est un secret Cloudflare limité à Actions en écriture sur ce seul dépôt. `VALIDATION_TOKEN` est un jeton aléatoire de 32 octets partagé avec le secret GitHub `M0_PUBLICATION_TOKEN`. La variable GitHub `M0_PUBLICATION_ORIGIN` désigne la preview de test. Le navigateur ne reçoit aucun de ces secrets. [Permissions GitHub](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)

La preview avec admin et le test du clic hébergé restent à réaliser. Un échec du runner laisse actuellement la demande en attente et la révision précédente en ligne. La remontée d’un état d’échec explicite reste à tester avant ouverture.


## Préparer la preview du parcours admin

Depuis `prototypes/m0-pages`, lancer `node benchmarks/image-publication/stage-preview.js`. Le répertoire ignoré `.wrangler/publication-preview` contient le formulaire admin existant et les Functions à compiler. Le filtre exige l’origine exacte, une échéance et un jeton de preview. Les routes du runner vérifient séparément son jeton. Le test local confirme le refus anonyme et le refus après expiration.

Configurer le secret `GITHUB_DISPATCH_TOKEN` dans **Preview** du projet Pages de test. Le contrôle d’accès hébergé et le clic de publication restent à vérifier après configuration du secret.

## Clic Publier vérifié sur la preview le 11 novembre 2026

Dans Edge, un compte fictif s’est connecté avec un authentificateur WebAuthn virtuel, a enregistré un brouillon, puis a cliqué une seule fois sur **Publier ou restaurer**. Pages a renvoyé 202. Le [job GitHub de publication](https://github.com/Dewaxe/site-villa-corse/actions/runs/43005104705) a réencodé l’image et transmis le dérivé. D1 confirme une demande publiée. L’interface affiche « Révision publiée » et le média livré se décode à 320 × 240. L’article était inaccessible avant le clic. Le test a aussi confirmé les refus sans jeton de preview et sans session admin.

Les premiers essais ont renvoyé 503 et laissé la demande en attente. Le déploiement réussi utilise l’identifiant du workflow vérifié, normalise les espaces autour du jeton et traite explicitement le statut GitHub. Le job a créé zéro artefact. La variable et le secret temporaires GitHub ont été retirés. L’essai utilise une branche de preview et des ressources D1/KV fictives.


## Échec du traitement vérifié en preview

Le 11 novembre 2026, le compte fictif B a soumis un WebP tronqué dont les en-têtes passaient le filtre. Le clic a reçu 202, puis Sharp a échoué à lire les pixels sur le [runner GitHub](https://github.com/Dewaxe/site-villa-corse/actions/runs/43005672578). Les réponses HTML et WebP de la révision publiée sont restées identiques octet pour octet. Le média de la nouvelle demande répondait 404. D1 comptait une demande publiée et une en attente.

Lors de ce premier essai, la demande est restée en attente malgré le rejet.


## Message de rejet vérifié dans Edge

Le 11 novembre 2026, Edge a publié une image de référence puis soumis un WebP tronqué. Le [workflow](https://github.com/Dewaxe/site-villa-corse/actions/runs/43006216865) a signalé le rejet au Worker. D1 comptait une demande publiée et une en échec. Edge a affiché « Image refusée. La version précédente reste en ligne. » Le HTML et le média précédents sont restés identiques. Le média rejeté répond 404.

Le test local vérifie aussi le refus d’une mauvaise empreinte, le rejeu du signal et l’impossibilité de publier un résultat reçu après le rejet. Avant l’ajout d’une échéance, un runner interrompu avant son appel de retour pouvait laisser la demande en attente.


## Demande sans réponse

Une demande expire après huit minutes, dont six pour la durée maximale du workflow et deux de marge pour le démarrage. Le serveur refuse les résultats tardifs et vérifie l’échéance dans la transaction de publication. Un nouveau clic après expiration attribue un nouvel identifiant au même brouillon. Les traitements précédents ne peuvent plus publier cette demande.

Dans Edge, le [workflow de contrôle](https://github.com/Dewaxe/site-villa-corse/actions/runs/43007071758) a été déclenché sans exécuter le traitement. L’échéance de la seule demande fictive a été avancée en D1 pour simuler l’attente. L’interface a affiché « Le traitement n’a pas répondu à temps. Tu peux relancer la publication. » Le HTML et le WebP précédents étaient identiques et le média du brouillon renvoyait 404. Le test local couvre aussi l’expiration pendant l’écriture KV et le refus d’un retour lié à l’ancien identifiant.
