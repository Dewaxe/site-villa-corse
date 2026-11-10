# Essai WebAuthn Pages à accès restreint

Ce banc réutilise le gestionnaire WebAuthn et D1 du prototype. Il expose uniquement une page de test, l’enrôlement d’une identité fictive, la connexion, la lecture de session et la déconnexion. Le RP ID correspond au nom d’hôte de l’origine configurée. Les URLs d’articles, d’upload et de gestion des clés sont hors de la liste de routage de cet artefact.

La Function vérifie le nom d’hôte et le schéma, la méthode, le jeton Bearer et son heure d’expiration avant de traiter la session. Les URLs alternatives du déploiement sont refusées par la Function. Le jeton contrôle l’accès au banc et l’invitation contrôle séparément l’enrôlement. Ce filtre s’exécute dans Pages Functions, donc une requête refusée sur une route incluse peut toujours consommer une invocation.

## Vérifier le banc

- En local, lancer `pwsh -NoProfile -File ./ci-check.ps1` depuis `prototypes/m0-pages`. La suite réutilise une base restaurée sans authentifiants, vérifie l’expiration du filtre et exécute le parcours dans Edge avec un authentificateur virtuel.
- Pour l’essai HTTPS, utiliser un projet Pages et une base D1 fictive dédiés sur Workers Free, avec les migrations du banc de sessions. Configurer uniquement la preview avec `DB`, `nodejs_compat`, `fail_open: false`, l’origine exacte `PROBE_ORIGIN` et l’expiration `PROBE_UNTIL` en millisecondes Unix. Définir deux secrets aléatoires indépendants de 32 octets en Base64URL, `PROBE_TOKEN` et `INVITE_A`. Déployer `auth-preview/public` et les Functions du même dossier sur une branche de preview. Vérifier via l’API que le projet de test a zéro déploiement de production.
- Dans une session locale avec `PROBE_ORIGIN`, `PROBE_TOKEN` et `INVITE_A` injectés en mémoire, exécuter `node auth-preview/check.js`. Le script attend huit vérifications de signature réussies, refuse le rejeu et contrôle la révocation après déconnexion. Il imprime quatre fenêtres UTC séparées par au moins deux secondes : demande et vérification d’enrôlement, demande de défi de connexion et vérification de signature. Pour tester le second compte, définir `PROBE_ACCOUNT=demo-b` et fournir son invitation au script dans la variable locale `INVITE_A`.
- Dans GraphQL, interroger `pagesFunctionsInvocationsAdaptiveGroups` pour le script et la fenêtre de vérification. Comparer le nombre d’invocations aux huit réponses attendues. Rapporter l’intervalle d’échantillonnage et les percentiles CPU `cpuTimeP50`, `cpuTimeP95` et `cpuTimeP99` en convertissant les microsecondes en millisecondes. Une mesure agrégée et échantillonnée décrit seulement ce scénario. [Métriques Pages](https://developers.cloudflare.com/pages/functions/metrics/) · [Limites Workers](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)


## Preuve HTTPS du 10 novembre 2026

Le projet de test avait deux déploiements de preview et zéro déploiement de production. Les deux hôtes de la première preview échouaient à négocier TLS après le déploiement. Une fois HTTPS accessible, un second déploiement sur le même projet a permis l’essai avec un nouveau jeton valable deux minutes et la même base D1 fictive.

Dans Edge, une clé virtuelle a été enrôlée et les huit vérifications de signature ont réussi (HTTP 200). Le rejeu et la lecture de session après déconnexion ont renvoyé 401. Les appels anonymes ont reçu 404, l’upload était inaccessible, et le jeton valide a été refusé sur l’URL immuable alternative. Après les deux minutes, le même jeton sur l’alias autorisé a reçu 404.

De 21:06:07 à 21:06:09 UTC (borne haute exclue), GraphQL a estimé huit invocations réussies, le même nombre qu’Edge, avec un intervalle d’échantillonnage moyen de 1,33. CPU de vérification estimé : médiane 4,863 ms, p95 et p99 9,351 ms. Le dataset a renvoyé `scriptName: __unknown__`, donc le rapprochement repose sur le créneau isolé et le nombre d’appels. La fenêtre précédente, qui mêle notamment l’enrôlement et les demandes de défi, affiche un p99 de 11,282 ms. Elle ne permet pas d’attribuer le pic à une route. Ces mesures laissent la marge réelle à confirmer.


## Mesure séparée des phases

Essai HTTPS du 10/11/2026 avec un second compte fictif. Edge confirme huit connexions réussies, le refus du rejeu et la révocation après déconnexion. GraphQL renvoie les volumes attendus et un intervalle d’échantillonnage de 1. Le script reste identifié comme `__unknown__`. Le rapprochement repose sur le temps et les volumes. La requête utilise `dimensions { datetimeMinute scriptName status }` avec borne haute exclue.

| Phase | Créneau UTC | Appels | CPU médian | CPU p95 |
| --- | --- | ---: | ---: | ---: |
| Demande d’enrôlement | 21:11:30 à 21:11:32 | 1 | 8,412 ms | — |
| Vérification d’enrôlement | 21:11:33 à 21:11:34 | 1 | 10,274 ms | — |
| Demande de défi de connexion | 21:11:35 à 21:11:37 | 8 | 3,805 ms | 6,526 ms |
| Vérification de connexion | 21:11:38 à 21:11:40 | 8 | 6,207 ms | 10,927 ms |

Pour les deux phases de connexion, le p99 est égal au p95 sur cet échantillon. Les appels HTTP ont réussi. Cloudflare documente que des quantiles peuvent dépasser la limite CPU sans erreur d’invocation. La marge reste à établir. [Métriques Pages](https://developers.cloudflare.com/pages/functions/metrics/#cpu-time-per-execution)


## Sonde de vérification sans D1

Sur la preview temporaire, exécuter `node auth-preview/crypto-check.js` avec `PROBE_ORIGIN` et `PROBE_TOKEN` en mémoire. La sonde vérifie une assertion ES256 fictive avec la même bibliothèque que la connexion. Le client fournit la clé publique et le défi. Le serveur vérifie le jeton avant toute lecture du corps, limite le JSON et refuse le défi invalide. Le scénario répète la même assertion 24 fois à des fins de mesure. La route ne consulte pas D1 et ne crée aucune session.

La comparaison avec le parcours complet indique un ordre de grandeur. Les mesures viennent de deux exécutions distinctes et ne permettent pas de calculer le coût de D1 par soustraction.