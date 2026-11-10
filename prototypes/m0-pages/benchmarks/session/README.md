# Démonstrateur local WebAuthn et D1

Cet essai est séparé de Pages. Il écoute uniquement sur la boucle locale. Deux comptes fictifs, chacun protégé par sa propre invitation, peuvent enrôler une clé. Les défis et les sessions expirables sont persistés dans D1 local.

Depuis `prototypes/m0-pages`, installer les dépendances avec `pnpm install --frozen-lockfile`. Dans PowerShell, créer les invitations si le fichier local est absent, puis préparer une base neuve pour chaque exécution du test :

```powershell
$vars = Join-Path (Get-Location) 'benchmarks/session/.dev.vars'
if (-not (Test-Path -LiteralPath $vars)) {
  function New-DemoInvite {
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  }
  [System.IO.File]::WriteAllText($vars, "INVITE_A=$(New-DemoInvite)`nINVITE_B=$(New-DemoInvite)`n")
}
$env:WRANGLER_SEND_METRICS = 'false'
$state = Join-Path '.wrangler' ('session-' + [guid]::NewGuid().ToString('N'))
pnpm exec wrangler d1 migrations apply DB --local --persist-to $state --config benchmarks/session/wrangler.jsonc
if ($LASTEXITCODE -ne 0) { throw 'Migration D1 locale échouée.' }
pnpm exec wrangler dev --local --persist-to $state --config benchmarks/session/wrangler.jsonc
```

Dans un autre terminal, avec Microsoft Edge installé :

```powershell
node benchmarks/session/browser-check.js
```

Le test utilise deux contextes Edge indépendants et des authentificateurs virtuels Chromium. Il vérifie le refus d’une mauvaise invitation, l’enrôlement, la connexion, le rejeu concurrent, les attributs du cookie, la rotation de session et le refus de l’ancien cookie. Il vérifie aussi la protection d’origine sur la déconnexion et la révocation côté serveur. Les invitations et la base locale restent hors Git.

Le `DELETE … RETURNING` retire le défi en une opération. Deux requêtes peuvent arriver ensemble, mais seule celle qui a retiré la ligne obtient un défi à vérifier. Pour la session, le navigateur reçoit le jeton opaque et D1 ne garde que son empreinte SHA-256. Le jeton vient du générateur aléatoire et a 256 bits d’entropie. Il ne nécessite pas une KDF coûteuse comme un mot de passe humain.

Le test passe sous Windows avec Edge headless et Wrangler 4.150.0. Le démonstrateur reste local. La récupération après perte de clé, les appareils physiques, les contrôles de débit et de taille des requêtes, ainsi que le CPU de la plateforme demandent des essais séparés.
