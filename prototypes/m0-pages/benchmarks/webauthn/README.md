# Banc local WebAuthn

Depuis `prototypes/m0-pages`, installer les dépendances avec `pnpm install --frozen-lockfile`, puis lancer dans deux terminaux :

```powershell
$env:WRANGLER_SEND_METRICS = 'false'
pnpm exec wrangler dev --local --config benchmarks/webauthn/wrangler.jsonc
```

```powershell
node benchmarks/webauthn/check.js
```

Le client Node simule un authentificateur avec deux paires de clés P-256 générées à chaque exécution. Le Worker vérifie les assertions avec SimpleWebAuthn 14.1.0. On utilise la bibliothèque serveur pour réutiliser ses contrôles WebAuthn et le décodage COSE, sans livrer de JavaScript au navigateur. La route `/fixture` charge des clés publiques de test et le stockage en mémoire ne couvre qu’un isolate. Le banc écoute uniquement sur la boucle locale et reste hors de l’artefact Pages.

Les deux identités obtiennent le même rôle de démonstration. Mauvaise origine, mauvais RP ID, mauvais défi, vérification utilisateur absente et mauvaise clé sont refusés. Deux soumissions simultanées du même défi produisent un succès et un refus, et toute répétition ultérieure est refusée.

Sous Windows avec Node 24.22.1 et Wrangler 4.150.0, la première série de dix requêtes donne une **médiane HTTP de 5,6 ms** et un **maximum de 10,2 ms** pour `/verify`, après les tests fonctionnels. La mesure exclut l’émission du défi et la signature côté client. Elle inclut le transport HTTP local et ne mesure pas le CPU de la plateforme.

Ce banc ne valide ni l’enrôlement dans un navigateur, ni les sessions, ni la récupération. Le test de concurrence local doit être reproduit avec un stockage partagé avant toute ouverture de l’administration. Voir [ADR-004](../../../../docs/DECISIONS.md#adr-004--authentificationnotifications-ouvert).

La relance avec le lockfile figé donne 5,2 ms de médiane et 6,1 ms de maximum. L’audit pnpm signale quatre avis élevés et quatre modérés sur Undici 7.29.1, déjà présent via Wrangler/Miniflare avant cet ajout. Vérifier la mise à niveau de l’outillage avant la preview.
