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

## Mesure CPU du dépôt et du retour

Le 11 novembre 2026, la lecture de `pagesFunctionsInvocationsAdaptiveGroups` a renvoyé des percentiles par script et statut. Le filtre expose le script, l’horodatage et le statut, mais aucun chemin HTTP. Les appels de session, de suivi et de publication peuvent donc se retrouver dans le même groupe. Les agrégats historiques consultés ne permettent pas d’attribuer un percentile au dépôt ou au retour du dérivé.

1. Reprendre la preview isolée décrite ci-dessus avec les données fictives et Workers Free. Préparer deux WebP valides, dont un proche de la limite de 250 ko. Noter les octets, les dimensions et la révision du code.
2. Relever les fenêtres UTC du `POST /api/articles/draft` et du `POST` de résultat du runner. Identifier chaque invocation par méthode, chemin et statut dans `wrangler pages deployment tail`. Pour la mesure, éviter les lectures de suivi dans ces fenêtres et consigner les appels voisins. Garder les en-têtes et les secrets hors des relevés.
3. Interroger GraphQL pour le script de preview sur chaque fenêtre séparément. Comparer `sum.requests` au nombre d’appels relevés. Si le groupe contient d’autres routes ou si les comptes divergent, refaire la mesure dans une fenêtre isolée. Convertir `cpuTimeP50`, `cpuTimeP95` et `cpuTimeP99` des microsecondes en millisecondes et noter l’échantillonnage s’il est disponible.
4. Rapporter les deux phases séparément et vérifier les réponses attendues, l’absence d’arrêt CPU et la disponibilité du média publié. Comparer les observations au plafond de 10 ms. Un percentile sur un petit lot décrit l’essai, avec une marge en exploitation qui reste à confirmer.

[Métriques Pages Functions](https://developers.cloudflare.com/pages/functions/metrics/) · [Limites CPU Workers](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)

### Essai HTTPS du 11 novembre 2026

Une preview Pages temporaire avec D1 et KV dédiés a accepté le dépôt de 248 270 octets (`201`, 16:31:44.848–16:31:46.333 UTC) et le dérivé de 187 888 octets (`200`, 16:31:52.094–16:31:52.322 UTC). L’article publié répondait `200`. Edge a utilisé un authentificateur WebAuthn virtuel. Le script du runner a été lancé localement sur la demande D1 après l’échec attendu du déclenchement sans jeton GitHub. Le dépôt et le retour ont traversé les Functions hébergées. Le projet Pages, sa base D1 et son espace KV ont été retirés après l’essai.

GraphQL a associé une seule invocation réussie à 16:31:45 UTC, dans la fenêtre du dépôt, avec **8,867 ms CPU**. Le nom de script affiché après le retrait du projet était `__unknown__`. La seconde précédant la fenêtre locale du retour regroupe deux invocations, à 6,628 ms au p50 et 7,220 ms au p95. La fenêtre locale du retour est vide. Le CPU du retour reste à isoler. Pour le prochain essai, espacer explicitement la lecture source et le retour du dérivé, relever l’horodatage côté Cloudflare et conserver le projet jusqu’à la lecture des métriques.

### Second essai HTTPS du 11 novembre 2026

Le script du runner a tourné localement et a attendu 12 secondes avant le retour. Le dépôt de 248 378 octets a répondu `201` et la seconde de mesure à 16:37:15 UTC contient une invocation à **6,089 ms CPU**. Le retour de 188 058 octets a répondu `200` avec un en-tête `Date` à 16:37:33 UTC. Cette seconde contient une invocation à **12,812 ms CPU**. GraphQL affiche `__unknown__` comme nom de script. L’attribution repose sur les fenêtres isolées, les compteurs unitaires et l’horodatage HTTP. La lecture de l’article a réussi et les ressources temporaires ont été retirées.

Le retour dépasse la cible M0 de 10 ms dans cet essai, malgré son succès HTTP. Il faut réduire le coût du retour et répéter les mesures avant de valider la marge sur Workers Free.

### Vérification après suppression de la copie du WebP

Le retour valide directement le tampon reçu, avec les mêmes contrôles de format. La suite locale `ci-check.ps1` et les tests de publication et de stockage passent. En preview, le dépôt de 248 338 octets a répondu `201` à 8,531 ms CPU. Le retour de 188 196 octets a répondu `200` à 16,555 ms CPU. Le compteur GraphQL est de un pour chaque seconde isolée, avec le nom de script `__unknown__`. La mesure du retour correspond à l’en-tête HTTP `Date` à 16:44:07 UTC. Le runner a tourné localement. L’article répondait `200` et les ressources temporaires ont été retirées.

La mesure du retour reste au-dessus de 10 ms. Le prochain essai doit mesurer plusieurs retours et examiner séparément la lecture bornée du corps, le calcul de l’empreinte et les opérations KV et D1.

### Lecture directe du corps binaire

Le retour assemble les segments dans un tampon de la taille réelle, avec réutilisation du segment unique quand c’est possible. Le contrôle du plafond porte toujours sur les octets reçus. Le test couvre une taille déclarée inférieure au corps réel. Les tests de stockage et de publication, ainsi que `ci-check.ps1`, passent.

Au premier essai, le dépôt de 248 052 octets répond `201` à **5,715 ms CPU** et le retour de 187 842 octets répond `200` à **6,269 ms CPU**, avec un appel par fenêtre. L’article est accessible. Le runner a tourné localement et les ressources temporaires ont été retirées.

Quatre publications supplémentaires réussissent. Trois retours sont attribuables à une invocation chacun, à **11,058**, **7,400** et **7,055 ms CPU**. La fenêtre du quatrième retour ne contient aucune mesure attribuable. Les dépôts mesurés vont de **4,832 à 10,896 ms CPU**. Le dépassement sur les deux routes impose de vérifier leur marge sur un lot supplémentaire.

### Lecture du statut dans la transaction D1

Le lot D1 renvoie le statut final et l’empreinte du résultat dans la même transaction. Le test de stockage simule deux dérivés différents arrivant pour la même demande et vérifie que le second reçoit un refus. La suite `ci-check.ps1` passe.

En preview, quatre dépôts de 247 882 à 248 062 octets répondent `201` et quatre retours de 187 550 à 187 798 octets répondent `200`. Les dépôts sont à **7,766–8,812 ms CPU**. Les invocations uniques proches des quatre retours affichent **16,321**, **7,150**, **14,497** et **8,578 ms CPU**. Les trois dernières se trouvent une seconde avant l’en-tête HTTP `Date`. Le script GraphQL est `__unknown__`, l’attribution repose donc sur l’espacement des appels et leurs horodatages. Le runner a tourné localement, les articles répondent `200` et les ressources temporaires sont retirées.

Le regroupement D1 réduit le nombre d’appels au stockage, mais la marge CPU du retour reste insuffisante sur ce lot. Pour localiser le coût, instrumenter la lecture, l’empreinte, l’écriture KV et la transaction D1. Comparer les durées de chaque étape aux mesures CPU de l’invocation entière avant de modifier le pipeline.

### Retours instrumentés

`PUBLICATION_TIMINGS=1` ajoute `Server-Timing` à la réponse authentifiée du retour. Quatre publications avec runner local et Pages hébergé ont réussi. La lecture du corps prend 2–5 ms, la lecture D1 12–14 ms, l’écriture KV 83–113 ms et la transaction D1 21–24 ms de temps écoulé. L’empreinte et le contrôle WebP affichent 0 ms à la résolution de l’horloge. L’horloge hébergée avance lors des entrées-sorties et ces valeurs ne permettent pas de répartir le CPU par étape. [Horloge Workers](https://developers.cloudflare.com/workers/runtime-apis/performance/)

GraphQL indique 13,217, 7,039, 18,001 et 6,151 ms CPU pour les invocations uniques proches des retours. Le rapprochement utilise leurs fenêtres isolées et le décalage observé d’environ une seconde avec les en-têtes HTTP `Date`. Le nom de script est `__unknown__`. Les ressources temporaires ont été retirées. KV domine le temps écoulé. Pour identifier la source des dépassements CPU, comparer les variantes sur des charges identiques en isolant d’abord l’empreinte et la préparation du corps de l’écriture KV.

### Comparaison locale sur un WebP identique

Sous Node 24.22.1, un WebP reproductible de 190 620 octets a servi aux cinq mesures. Chaque mesure utilise sept lots de 400 appels, après 40 appels d’échauffement par lot, avec inversion de l’ordre entre les lots. Les valeurs représentent le CPU du processus par appel.

| Opération | Médiane | Plage des lots |
| --- | ---: | ---: |
| SHA-256 Web Crypto et conversion hexadécimale actuelle | 195 µs | 117,5–235 µs |
| SHA-256 via `node:crypto` | 77,5 µs | 77,5–117,5 µs |
| Lecture bornée et assemblage direct des segments | 155 µs | 77,5–350 µs |
| Lecture bornée via `Blob` puis `arrayBuffer()` | 392,5 µs | 352,5–507,5 µs |
| Contrôle du conteneur WebP | Sous la résolution de la mesure | |

Les deux calculs SHA-256 donnent la même empreinte. Les écarts locaux mesurés sont inférieurs à la milliseconde. Le chemin actuel transmet les octets assemblés directement à KV. La mesure Node couvre leur préparation et ne permet pas de chiffrer le coût CPU de l’appel KV hébergé. Le prochain banc devra comparer sur Pages le retour complet et une écriture KV isolée du même tampon, avec des invocations séparées et une correspondance vérifiée dans GraphQL.

### Comparaison KV sur Pages

La preview temporaire ajoute une sonde authentifiée qui lit le corps avec le même plafond de 250 000 octets. Selon la variante, elle écrit aussi le tampon dans KV sous une clé unique. Chaque triplet utilise le même dérivé pour le retour complet et les deux sondes. L’ordre des sondes alterne. Chaque résultat correspond à une invocation réussie dans la seconde indiquée par l’en-tête HTTP `Date`. Le nom de script GraphQL reste `__unknown__`. Les retours répondent `200` et les sondes `204`.

| Dérivé en octets | Lecture seule, CPU ms | Lecture + KV, CPU ms | Retour complet, CPU ms |
| ---: | ---: | ---: | ---: |
| 187 820 | 2,157 | 3,573 | 10,039 |
| 187 842 | 3,425 | 4,383 | 15,375 |
| 187 680 | 2,255 | 2,995 | 7,560 |
| 188 006 | 4,000 | 5,320 | 7,212 |

L’écart entre les sondes d’un même triplet va de 0,740 à 1,416 ms CPU. L’écriture KV seule ne reproduit pas les dépassements du retour complet dans ce lot. Des dépôts proches de 248 ko dépassent également 10 ms dans ce même essai. Les quatre articles répondent `200`. Le projet Pages, D1 et KV temporaires ont été retirés. Le prochain diagnostic doit comparer la lecture binaire et la validation existantes avec l’ajout des opérations D1 à charge identique.

### Comparaison D1 sur Pages

Quatre triplets utilisent chacun les mêmes octets. Le témoin lit le corps, calcule le SHA-256 et vérifie le conteneur. La sonde D1 utilise la fonction de publication avec une base fictive dédiée et une écriture KV simulée. Le retour complet utilise les bindings D1 et KV réels. L’ordre des deux sondes alterne. Chaque valeur est issue d’une invocation unique à la seconde de l’en-tête HTTP `Date`. GraphQL affiche `__unknown__` comme nom de script.

| Dérivé en octets | Témoin, CPU ms | Sonde D1, CPU ms | Retour complet, CPU ms |
| ---: | ---: | ---: | ---: |
| 187 994 | 5,649 | 8,838 | 19,533 |
| 187 686 | 4,434 | 9,691 | 17,592 |
| 187 898 | 9,605 | 8,611 | 9,416 |
| 187 680 | 3,733 | 5,827 | 17,539 |

L’écart entre la sonde D1 et le témoin varie de −0,994 à +5,257 ms CPU. Les valeurs sont des observations appariées avec des invocations distinctes. Elles ne permettent pas d’attribuer un coût fixe à D1. Les quatre publications réussissent et trois retours complets dépassent 10 ms. Les quatre dépôts restent entre 5,502 et 8,836 ms CPU dans ce lot. Le projet Pages, les deux bases D1 et KV temporaires ont été retirés. Le prochain essai peut tester un retour en deux requêtes, en validant le transfert avant de déclencher la transaction de publication.

### Retour en deux requêtes

Le runner local active `PUBLICATION_SPLIT=1`. Pages dispose d’une clé `PUBLICATION_RECEIPT_KEY` distincte du jeton du runner. Le transfert vérifie le conteneur et écrit le dérivé avant de signer un reçu. La confirmation vérifie le reçu et applique la transaction D1. Les tests locaux couvrent la visibilité du brouillon après transfert, le refus d’une empreinte altérée et le rejeu idempotent. `ci-check.ps1` passe.

| Dérivé en octets | Transfert KV, CPU ms | Confirmation D1, CPU ms |
| ---: | ---: | ---: |
| 187 794 | 6,400 | 13,430 |
| 188 022 | 4,290 | 6,396 |
| 188 054 | 5,889 | 3,654 |
| 188 106 | 3,085 | 3,425 |

Les huit requêtes répondent `200` et les articles publiés sont accessibles. Chaque mesure est rapprochée d’une invocation unique par l’en-tête `Date`, avec une seconde de décalage pour la première confirmation. GraphQL affiche `__unknown__`. Un transfert ou une confirmation interrompus peuvent laisser un objet privé orphelin. La variante reste expérimentale. Le premier appel de confirmation dépasse 10 ms. Pour le prochain essai, mesurer une confirmation après inactivité et vérifier si une seule transaction D1 peut remplacer la lecture puis l’écriture.

### Confirmation en un lot D1

La confirmation vérifie l’empreinte source, l’état de la demande, l’échéance et la version dans les écritures conditionnelles d’un seul lot D1. Le test de stockage refuse aussi un reçu valide signé pour une autre empreinte source. `ci-check.ps1`, le test de stockage et le test de publication passent.

| Publication | Dépôt, CPU ms | Transfert, CPU ms | Confirmation, CPU ms |
| ---: | ---: | ---: | ---: |
| 1 | 6,387 | 7,215 | 5,001 |
| 2 | 12,346 | 5,884 | 6,599 |
| 3 | 5,647 | 10,336 | 5,646 |
| 4 | 6,573 | 5,407 | 8,113 |

Quatre publications réussies avec runner local et Pages hébergé. La première confirmation suit 30 secondes d’inactivité. Les mesures sont rapprochées par fenêtres UTC et compteur unitaire, avec un décalage d’une seconde sur certaines invocations et un nom de script `__unknown__`. Un premier lancement a été interrompu par le délai HTTP du banc, corrigé avant cette série. Le projet, D1 et KV temporaires ont été retirés. La confirmation tient dans la cible sur ce lot. Le dépôt et le transfert restent à vérifier sur un lot plus large et avec un plafond de taille inférieur.

### Essai avec WebP allégés

Quatre images synthétiques de 540 × 405 px, de 150 574 à 150 916 octets au dépôt et de 108 240 à 108 552 octets au transfert, ont été publiées. Le runner a tourné localement. Les valeurs CPU sont rapprochées par fenêtres UTC et compteurs unitaires. Le deuxième dépôt est sans mesure attribuable.

| Publication | Dépôt, CPU ms | Transfert, CPU ms | Confirmation, CPU ms |
| ---: | ---: | ---: | ---: |
| 1 | 12,344 | 13,363 | 14,097 |
| 2 | — | 9,519 | 2,525 |
| 3 | 7,251 | 8,882 | 4,337 |
| 4 | 5,474 | 7,112 | 5,777 |

La première confirmation suit 30 secondes d’inactivité. Le lot ne valide pas le plafond de 10 ms. La qualité des photos de la villa reste à évaluer sur des images représentatives. Le test de stockage confirme qu’un transfert répété localement après perte du reçu rend le même reçu et laisse le brouillon privé jusqu’à la confirmation. Les tests de stockage et de publication passent. Le projet Pages, D1 et KV temporaires ont été retirés.

### Repli statique local

Depuis `prototypes/m0-pages`, lancer `node benchmarks/image-publication/static-release-check.js`. Le build utilise le rendu HTML de l’article et le réencodage Sharp du prototype. Il assemble la page et l’image dans un dossier neuf par révision. L’artefact de démonstration est en `noindex` et contient un `404.html`. Le test vérifie que V1 reste disponible après la génération de V2 et après le rejet d’une image tronquée.

Les fichiers statiques suppriment la lecture D1/KV lors de la visite publique. Un build qui reçoit déjà le brouillon et son image peut aussi produire le média final sans retour HTTP du dérivé. Le dépôt initial reste une requête Functions si le build s’alimente auprès de l’admin actuel. Le prochain essai doit qualifier la transmission privée du brouillon et de l’image et le retour entre deux déploiements Pages.

### Repli statique sur Pages

Le 11/11/2026, un alias Preview a servi V1, V2, puis V1 redéployée depuis le premier dossier conservé. Wrangler lancé depuis chaque dossier statique a envoyé les fichiers et leurs en-têtes. Le HTML de V2 et son WebP ont été comparés aux fichiers locaux. Après redéploiement, le HTML de V1 et le SHA-256 de son WebP correspondent aux originaux.

Le premier essai lancé depuis le dossier du prototype a embarqué ses Functions. L’essai statique a corrigé le dossier de lancement. Pendant le passage à V2, le HTML a brièvement précédé la disponibilité du WebP. Une requête sur l’ancienne URL a aussi renvoyé un `HIT` de cache alors que l’URL avec une nouvelle query string renvoyait 404. La vérification a donc porté sur la disponibilité et l’intégrité des deux fichiers attendus. La gestion de la propagation et du cache reste à qualifier avant une utilisation réelle.

Le test local de stockage récupère le manifeste privé et le WebP via la même demande de publication. Il recalcule le SHA-256 et produit l’artefact à partir de ces réponses. Le manifeste est disponible sur demande active avec le jeton de validation et l’option `PUBLICATION_STATIC_PROBE=1`. L’accès anonyme, le mode désactivé et une demande déjà publiée répondent 404. Le raccordement d’un job GitHub qui assemble et déploie cet instantané reste à tester.

### CPU du dépôt en preview

Le 11/11/2026, Edge a envoyé quatre WebP fictifs via le parcours admin authentifié. Le premier dépôt a suivi 30 secondes d’inactivité. Les quatre requêtes ont répondu HTTP 201.

| Heure UTC, en-tête HTTP Date | Octets | CPU Cloudflare |
| --- | ---: | --- |
| 21:44:55 | 150 930 | p99 agrégé de 5,049 ms pour deux invocations |
| 21:45:01 | 150 850 | 3,388 ms |
| 21:45:07 | 150 834 | 3,213 ms |
| 21:45:14 | 150 858 | 4,350 ms, invocation unique à 21:45:13 |

GraphQL identifie le script comme `__unknown__`. L’attribution des trois derniers relevés repose sur des fenêtres isolées avec une invocation par seconde. Le premier dépôt reste sans mesure individuelle. Ce lot couvre les images d’environ 151 ko. Les ressources Pages, D1 et KV temporaires ont été retirées.

### Comparaison sur une photo de Cargèse

Source de test : [Corse – Cargèse vue du port](https://commons.wikimedia.org/wiki/File:Corse_-_Carg%C3%A8se_vue_du_port.jpg), Jean-Christophe BENOIST, [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Original JPEG de 4 272 × 2 848 pixels et 3 752 888 octets. Les variantes ont été redimensionnées et converties en WebP avec Sharp.

| Largeur | Qualité WebP | Octets |
| ---: | ---: | ---: |
| 1 600 px | 25 | 149 420 |
| 1 600 px | 55 | 248 068 |
| 800 px | 89 | 147 568 |

À 600 px d’affichage, les deux variantes de 1 600 px sont proches. Dans un extrait affiché à sa taille réelle, la variante de 248 ko préserve davantage les détails des bateaux et de la végétation. La photo sert d’exemple de paysage détaillé pour l’essai.

Le banc Edge authentifié a obtenu HTTP 201 pour les quatre dépôts. Les mesures GraphQL correspondent à des fenêtres isolées d’une invocation.

| UTC, invocation Cloudflare | Octets | CPU |
| --- | ---: | ---: |
| 22:23:54, après 30 s d’inactivité | 248 068 | 11,913 ms |
| 22:24:00 | 248 068 | 15,872 ms |
| 22:24:06 | 149 420 | 5,598 ms |
| 22:24:12 | 149 420 | 5,890 ms |

Les deux dépôts proches de 250 ko dépassent la cible de 10 ms malgré leur succès HTTP. Les deux dépôts proches de 150 ko restent sous la cible sur cette photo. Le premier déploiement n’a pas atteint l’étape de dépôt dans le délai HTTPS. Le second a abouti après allongement de ce délai. Les deux projets Pages et leurs ressources D1 et KV ont été retirés.

### Bilan CPU du dépôt binaire et du retour

Le 11/11/2026, trois dépôts authentifiés du même WebP de 248 068 octets répondent HTTP `201` sur Pages en preview. Le navigateur envoie le JSON et le WebP dans un corps binaire borné. Le lot multipart de référence utilise le même WebP.

| Invocation UTC | Dépôt binaire | CPU Cloudflare |
| --- | --- | ---: |
| 22:48:08 | Après 30 s d’inactivité | 5,737 ms |
| 22:48:14 | Deuxième envoi | 8,754 ms |
| 22:48:20 | Troisième envoi | 3,722 ms |

Chaque fenêtre GraphQL compte une invocation (script `__unknown__`). Le maximum observé laisse 1,246 ms sous le [budget de 10 ms de Workers Free](https://developers.cloudflare.com/workers/platform/limits/#cpu-time). Le test local refuse un corps tronqué sans écriture, puis accepte le renvoi complet en brouillon privé. Les ressources Pages, D1 et KV de la mesure ont été retirées.

Pour le retour du dérivé vers Pages, le [lot instrumenté](#retours-instrumentés) donne 13,217, 7,039, 18,001 et 6,151 ms sur quatre retours HTTP réussis. Deux appels dépassent la cible. Le prototype retient la publication statique : Actions lit la source privée, produit le WebP et le déploie avec le HTML. Aucun dérivé ne repasse par la Function. Le retour de statut est distinct et ne transporte pas l’image. Le [test en preview via le bouton Publier](https://github.com/Dewaxe/site-villa-corse/actions/runs/43101923127) a servi le HTML et le WebP en HTTP `200`, avec le SHA-256 attendu pour l’image.

Les deux phases ont été mesurées. Le dépôt binaire tient dans la cible sur ce lot et le retour d’image initial est écarté. Ces essais distincts qualifient le choix pour le prototype M0 ; trois mesures sur un fichier ne garantissent pas la marge de l’admin en exploitation. Suivi : [issue #1](https://github.com/Dewaxe/site-villa-corse/issues/1) et [ADR-003](../../../../docs/DECISIONS.md#validation-des-images-après-la-mesure-cpu).

### Workflow du repli statique

Le workflow `m0-transfer.yml` active le build statique avec la variable `M0_PUBLICATION_STATIC=1`. Le runner récupère l’image et le manifeste authentifiés, compare les empreintes et génère l’instantané dans `RUNNER_TEMP`. L’étape de déploiement reçoit le jeton Pages `M0_STATIC_PAGES_TOKEN` et les variables `M0_STATIC_ACCOUNT_ID`, `M0_STATIC_PROJECT` et `M0_STATIC_ORIGIN`. Elle lance Wrangler depuis l’instantané et cible la branche `static-test` d’un projet `m0-static-*`. L’essai local du runner a simulé les deux réponses HTTP et vérifié la génération de la page. Les tests de stockage et de génération passent.

L’exécution hébergée doit relier le job à une demande fictive, configurer le jeton du projet temporaire et vérifier sur l’alias le HTML et l’empreinte du média. Le parcours doit encore qualifier la transition du cache et le signal de réussite vers l’interface d’administration. Le dépôt d’origine reste soumis au budget CPU des Functions.

Le 11/11/2026, le dépôt fictif de 150 798 octets a répondu `201`. Le workflow a été déclenché manuellement avec l’identifiant de demande. Le build et le déploiement de l’instantané ont réussi. L’alias a servi le HTML attendu et son WebP en HTTP `200`. Le SHA-256 du WebP servi est `3e797a482931f870cb2840fa8cb4318a657f008283096055f4d56016a9234939`. Cette empreinte a été relevée après déploiement. Le banc a retiré les deux projets Pages, la base D1, le namespace KV, les cinq variables d’essai et le secret de transfert qu’il avait créé. [Exécution GitHub](https://github.com/Dewaxe/site-villa-corse/actions/runs/43080845513)
