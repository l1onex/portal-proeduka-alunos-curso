# Build da imagem com os mesmos --build-arg que o Dockerfile / GitHub Actions.
# Uso (PowerShell):  cd repo; .\deploy\build.ps1
# Opcional: $env:TAG = "ghcr.io/org/repo:main"; .\deploy\build.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $Root "deploy\stack.env"

if (-not (Test-Path $EnvFile)) {
    Write-Error "Crie $EnvFile a partir de deploy\stack.env.example"
}

Get-Content $EnvFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -match '^\s*#' -or $line -eq '') { return }
    $i = $line.IndexOf('=')
    if ($i -lt 1) { return }
    $key = $line.Substring(0, $i).Trim()
    $val = $line.Substring($i + 1).Trim()
    Set-Item -Path "Env:$key" -Value $val
}

$tag = if ($env:TAG) { $env:TAG } else { "proeduka:local" }
$alunos = if ($env:NEXT_PUBLIC_ALUNOS_TABLE) {
    $env:NEXT_PUBLIC_ALUNOS_TABLE
} elseif ($env:NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE) {
    $env:NEXT_PUBLIC_SUPABASE_ALUNOS_TABLE
} else {
    "proeduka_alunos"
}

$platformArgs = @()
if ($env:DOCKER_PLATFORM) {
    $platformArgs = @("--platform", $env:DOCKER_PLATFORM)
}

& docker build @platformArgs -f (Join-Path $Root "Dockerfile") `
    --build-arg "NEXT_PUBLIC_APP_URL=$env:NEXT_PUBLIC_APP_URL" `
    --build-arg "NEXT_PUBLIC_ALUNOS_TABLE=$alunos" `
    -t $tag `
    $Root
