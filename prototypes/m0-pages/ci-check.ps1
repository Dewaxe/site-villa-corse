$ErrorActionPreference = 'Stop'
$project = $PSScriptRoot
$node = (Get-Command node -CommandType Application | Select-Object -First 1).Source
$wrangler = 'node_modules/wrangler/bin/wrangler.js'
$config = 'benchmarks/session/wrangler.jsonc'
$name = 'ci-' + [guid]::NewGuid().ToString('N')
$source = "$name-source"
$target = "$name-restored"
$private = Join-Path $project ".wrangler/$name"
$stdout = Join-Path $private 'wrangler.log'
$stderr = Join-Path $private 'wrangler-error.log'
$inviteFile = Join-Path $private 'invites.env'
$previousInviteFile = $env:M0_INVITES_FILE
$previousSessionState = $env:M0_SESSION_STATE
$previousMetrics = $env:WRANGLER_SEND_METRICS
$previousProbeOrigin = $env:PROBE_ORIGIN
$previousProbeToken = $env:PROBE_TOKEN
$previousProbeInvite = $env:INVITE_A

function Invoke-Node {
  & $node @args
  if ($LASTEXITCODE -ne 0) { throw "Node failed with exit code $LASTEXITCODE." }
}

function New-Invite {
  $bytes = [byte[]]::new(32)
  [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Invoke-WithWrangler($port, $path, [string[]]$arguments, [scriptblock]$check) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    throw "Port $port already in use. Stop the existing local server before running the suite."
  }

  $process = Start-Process -FilePath $node -ArgumentList (@($wrangler) + $arguments) `
    -WorkingDirectory $project -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  try {
    $deadline = (Get-Date).AddSeconds(45)
    $ready = $false
    $hostname = if ($port -in 8791, 8793) { 'localhost' } else { '127.0.0.1' }
    while (-not $ready -and (Get-Date) -lt $deadline -and -not $process.HasExited) {
      & curl.exe --ipv4 --noproxy '*' --silent --fail --max-time 2 --output NUL "http://${hostname}:$port$path"
      $ready = $LASTEXITCODE -eq 0
      if (-not $ready) { Start-Sleep -Milliseconds 300 }
    }
    if (-not $ready) { throw "Wrangler did not become ready on port $port." }
    & $check
  } catch {
    Get-Content -LiteralPath $stdout, $stderr -Tail 15 | ForEach-Object {
      $_.Replace($inviteA, '[invitation hidden]').Replace($inviteB, '[invitation hidden]')
    }
    throw
  } finally {
    if (-not $process.HasExited) {
      & taskkill.exe /PID $process.Id /T /F | Out-Null
      $process.WaitForExit()
    }
  }
}

function Invoke-SessionChecks($state, [scriptblock]$check) {
  Invoke-WithWrangler 8791 '/' @(
    'dev', '--local', '--config', $config,
    '--persist-to', ".wrangler/$state",
    '--env-file', ('"' + $inviteFile + '"')
  ) $check
}

Push-Location $project
try {
  [void][System.IO.Directory]::CreateDirectory($private)
  $inviteA = New-Invite
  $inviteB = New-Invite
  [System.IO.File]::WriteAllText($inviteFile, "INVITE_A=$inviteA`nINVITE_B=$inviteB`n")
  $env:M0_INVITES_FILE = $inviteFile
  $env:M0_SESSION_STATE = $source
  $env:WRANGLER_SEND_METRICS = 'false'

  foreach ($file in (git ls-files -- '*.js')) { Invoke-Node --check $file }
  Invoke-Node --test benchmarks/session/hardening.test.js
  Invoke-WithWrangler 8788 '/api/health' @(
    'pages', 'dev', 'public', '--ip', '127.0.0.1', '--port', '8788',
    '--compatibility-date', '2026-10-06', '--persist-to', ".wrangler/$name/pages"
  ) { Invoke-Node --test routing.test.js }

  Invoke-Node $wrangler d1 migrations apply DB --local --persist-to ".wrangler/$source" --config $config
  Invoke-SessionChecks $source { Invoke-Node benchmarks/session/browser-check.js }

  Invoke-Node benchmarks/session/backup.js export $source $name
  Invoke-SessionChecks $source { Invoke-Node benchmarks/session/backup-http-check.js capture $name }
  Invoke-Node benchmarks/session/backup.js restore $target $name
  Invoke-SessionChecks $target { Invoke-Node benchmarks/session/backup-http-check.js compare $name }

  $pagesConfig = Get-Content -LiteralPath 'preview/wrangler.jsonc' -Raw | ConvertFrom-Json
  $targetPath = Join-Path $project ".wrangler/$target"
  Invoke-WithWrangler 8792 '/api/health' @(
    'pages', 'dev', '--cwd', 'preview', '--ip', '127.0.0.1', '--port', '8792',
    '--persist-to', ('"' + $targetPath + '"'),
    '--d1', ('DB=' + $pagesConfig.d1_databases[0].database_id),
    '--kv', ('IMAGES=' + $pagesConfig.kv_namespaces[0].id)
  ) { Invoke-Node preview/check.js $name }

  $env:PROBE_ORIGIN = 'http://localhost:8793'
  $env:PROBE_TOKEN = $inviteB
  $env:INVITE_A = $inviteA
  $probeUntil = [DateTimeOffset]::UtcNow.AddMinutes(5).ToUnixTimeMilliseconds()
  Invoke-WithWrangler 8793 '/404.html' @(
    'pages', 'dev', 'public', '--cwd', 'auth-preview', '--ip', '127.0.0.1', '--port', '8793',
    '--compatibility-date', '2026-10-06', '--compatibility-flag', 'nodejs_compat',
    '--persist-to', ('"' + $targetPath + '"'), '--d1', ('DB=' + $pagesConfig.d1_databases[0].database_id),
    '--binding', "PROBE_ORIGIN=$env:PROBE_ORIGIN", "PROBE_TOKEN=$inviteB", "INVITE_A=$inviteA", "PROBE_UNTIL=$probeUntil"
  ) { Invoke-Node auth-preview/check.js }

  Invoke-Node benchmarks/ign/check.js
} finally {
  $env:M0_INVITES_FILE = $previousInviteFile
  $env:M0_SESSION_STATE = $previousSessionState
  $env:WRANGLER_SEND_METRICS = $previousMetrics
  $env:PROBE_ORIGIN = $previousProbeOrigin
  $env:PROBE_TOKEN = $previousProbeToken
  $env:INVITE_A = $previousProbeInvite
  foreach ($relative in ".wrangler/$name", ".wrangler/$source", ".wrangler/$target", "backups/$name") {
    $expected = [System.IO.Path]::GetFullPath((Join-Path $project $relative))
    if (Test-Path -LiteralPath $expected) {
      $resolved = (Resolve-Path -LiteralPath $expected).ProviderPath
      if ($resolved -eq $expected -and $resolved.StartsWith("$project\", [StringComparison]::OrdinalIgnoreCase)) {
        for ($attempt = 0; $attempt -lt 3; $attempt++) {
          try {
            Remove-Item -LiteralPath $resolved -Recurse -Force
            break
          } catch {
            if ($attempt -eq 2) { Write-Warning "Could not remove generated test state $relative." }
            else { Start-Sleep -Milliseconds 300 }
          }
        }
      }
    }
  }
  Pop-Location
}
