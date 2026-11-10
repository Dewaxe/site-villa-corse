# Essai WebAuthn Pages à accès restreint

Ce banc réutilise le gestionnaire WebAuthn et D1 du prototype. Il expose uniquement une page de test, l’enrôlement d’une identité fictive, la connexion, la lecture de session et la déconnexion. Le RP ID correspond au nom d’hôte de l’origine configurée. Les URLs d’articles, d’upload et de gestion des clés sont hors de la liste de routage de cet artefact.

La Function vérifie le nom d’hôte et le schéma, la méthode, le jeton Bearer et son heure d’expiration avant de traiter la session. Les URLs alternatives du déploiement sont refusées par la Function. Le jeton contrôle l’accès au banc et l’invitation contrôle séparément l’enrôlement. Ce filtre s’exécute dans Pages Functions, donc une requête refusée sur une route incluse peut toujours consommer une invocation.

## Vérifier le banc

- En local, lancer `pwsh -NoProfile -File ./ci-check.ps1` depuis `prototypes/m0-pages`. La suite réutilise une base restaurée sans authentifiants, vérifie l’expiration du filtre et exécute le parcours dans Edge avec un authentificateur virtuel.
- Pour l’essai HTTPS, utiliser un projet Pages et une base D1 fictive dédiés sur Workers Free, avec les migrations du banc de sessions. Configurer uniquement la preview avec `DB`, `nodejs_compat`, `fail_open: false`, l’origine exacte `PROBE_ORIGIN` et l’expiration `PROBE_UNTIL` en millisecondes Unix. Définir deux secrets aléatoires indépendants de 32 octets en Base64URL, `PROBE_TOKEN` et `INVITE_A`. Déployer `auth-preview/public` et les Functions du même dossier sur une branche de preview. Vérifier via l’API que le projet de test a zéro déploiement de production.
- Dans une session locale avec `PROBE_ORIGIN`, `PROBE_TOKEN` et `INVITE_A` injectés en mémoire, exécuter `node auth-preview/check.js`. Le script attend huit vérifications de signature réussies, refuse le rejeu et contrôle la révocation après déconnexion. Il sépare les vérifications de signature des autres appels d’au moins deux secondes et imprime leur fenêtre UTC.
- Dans GraphQL, interroger `pagesFunctionsInvocationsAdaptiveGroups` pour le script et la fenêtre de vérification. Comparer le nombre d’invocations aux huit réponses attendues. Rapporter l’intervalle d’échantillonnage et les percentiles CPU `cpuTimeP50`, `cpuTimeP95` et `cpuTimeP99` en convertissant les microsecondes en millisecondes. Une mesure agrégée et échantillonnée décrit seulement ce scénario. [Métriques Pages](https://developers.cloudflare.com/pages/functions/metrics/) · [Limites Workers](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)


## Preuve HTTPS du 10 novembre 2026

Le projet de test avait deux déploiements de preview et zéro déploiement de production. Les deux hôtes de la première preview échouaient à négocier TLS après le déploiement. Une fois HTTPS accessible, un second déploiement sur le même projet a permis l’essai avec un nouveau jeton valable deux minutes et la même base D1 fictive.

Dans Edge, une clé virtuelle a été enrôlée et les huit vérifications de signature ont réussi (HTTP 200). Le rejeu et la lecture de session après déconnexion ont renvoyé 401. Les appels anonymes ont reçu 404, l’upload était inaccessible, et le jeton valide a été refusé sur l’URL immuable alternative. Après les deux minutes, le même jeton sur l’alias autorisé a reçu 404.

De 21:06:07 à 21:06:09 UTC (borne haute exclue), GraphQL a estimé huit invocations réussies, le même nombre qu’Edge, avec un intervalle d’échantillonnage moyen de 1,33. CPU de vérification estimé : médiane 4,863 ms, p95 et p99 9,351 ms. Le dataset a renvoyé `scriptName: __unknown__`, donc le rapprochement repose sur le créneau isolé et le nombre d’appels. La fenêtre précédente, qui mêle notamment l’enrôlement et les demandes de défi, affiche un p99 de 11,282 ms. Elle ne permet pas d’attribuer le pic à une route. Ces mesures laissent la marge réelle à confirmer.
