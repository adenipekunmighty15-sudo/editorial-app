#requires -Version 7
<#
.SYNOPSIS
  Launch (or redeploy) the Rooted web service on Render.

.DESCRIPTION
  Uses the Render CLI to create the service described by render.yaml if it does
  not exist yet, or trigger a fresh deploy if it does. Requires the Render CLI
  to be installed and authenticated (`render login`).

.PARAMETER ServiceName
  Render service name. Defaults to "rooted".

.PARAMETER Repo
  Git repository URL to deploy from.

.PARAMETER Branch
  Git branch to deploy. Defaults to "main".

.PARAMETER Region
  Optional Render region (e.g. oregon, frankfurt, singapore).

.PARAMETER Plan
  Render plan. Defaults to "free".

.EXAMPLE
  ./tools/launch-render.ps1
.EXAMPLE
  ./tools/launch-render.ps1 -ServiceName rooted -Branch main -Region oregon
#>
[CmdletBinding()]
param(
  [string]$ServiceName = "rooted",
  [string]$Repo = "https://github.com/adenipekunmighty15-sudo/editorial-app",
  [string]$Branch = "main",
  [string]$Region,
  [string]$Plan = "free"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

function Fail([string]$msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# 1. CLI present?
$render = Get-Command render -ErrorAction SilentlyContinue
if (-not $render) {
  $fallbackDir = Join-Path $env:USERPROFILE "bin"
  $fallbackExe = Join-Path $fallbackDir "render.exe"
  if (Test-Path -LiteralPath $fallbackExe) {
    $env:Path = "$fallbackDir;$env:Path"
    $render = Get-Command render -ErrorAction SilentlyContinue
  }
}
if (-not $render) {
  Fail "Render CLI not found on PATH. Install it (e.g. to $env:USERPROFILE\bin) and reopen your shell."
}
Write-Host "Using Render CLI: $($render.Source)" -ForegroundColor Cyan

# 2. Authenticated?
& render whoami --output json *> $null
if ($LASTEXITCODE -ne 0) {
  Fail "Not authenticated. Run: render login   (then re-run this script)"
}
Write-Host "Authenticated." -ForegroundColor Green

# 3. Resolve MONGO_URI (env var wins, else backend/.env)
$mongoUri = $env:MONGO_URI
if (-not $mongoUri) {
  $envFile = Join-Path $repoRoot "backend/.env"
  if (Test-Path -LiteralPath $envFile) {
    $line = Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^\s*MONGO_URI\s*=' } | Select-Object -First 1
    if ($line) { $mongoUri = ($line -replace '^\s*MONGO_URI\s*=\s*', '').Trim().Trim('"').Trim("'") }
  }
}
if (-not $mongoUri -or $mongoUri -match '<') {
  Write-Host "WARNING: No usable MONGO_URI found (checked `$env:MONGO_URI and backend/.env)." -ForegroundColor Yellow
  Write-Host "         The service will deploy but DB routes will fail until you set MONGO_URI in the Render dashboard." -ForegroundColor Yellow
  $mongoUri = $null
}

$buildCommand = "npm --prefix backend install && npm --prefix frontend install && npm --prefix frontend run build"
$startCommand = "node backend/index.js"

# 4. Does the service already exist?
Write-Host "Looking for existing service '$ServiceName'..." -ForegroundColor Cyan
$existing = $null
$raw = & render services --output json 2>$null
if ($LASTEXITCODE -eq 0 -and $raw) {
  try {
    $parsed = $raw | ConvertFrom-Json
    $items = if ($parsed.services) { $parsed.services } elseif ($parsed -is [array]) { $parsed } else { @($parsed) }
    $existing = $items | Where-Object { $_.name -eq $ServiceName } | Select-Object -First 1
  } catch { Write-Host "Could not parse service list; will attempt create." -ForegroundColor Yellow }
}

if ($existing) {
  $id = $existing.id
  Write-Host "Service exists ($id). Triggering a deploy..." -ForegroundColor Cyan
  & render deploys create $id --confirm
  if ($LASTEXITCODE -ne 0) { Fail "Deploy failed to start." }
  $url = $existing.serviceDetails.url; if (-not $url) { $url = $existing.url }
} else {
  Write-Host "Service not found. Creating '$ServiceName'..." -ForegroundColor Cyan
  $cliArgs = @(
    "services", "create",
    "--name", $ServiceName,
    "--type", "web_service",
    "--repo", $Repo,
    "--branch", $Branch,
    "--runtime", "node",
    "--build-command", $buildCommand,
    "--start-command", $startCommand,
    "--health-check-path", "/api/health",
    "--plan", $Plan,
    "--env-var", "NODE_ENV=production",
    "--env-var", "ENABLE_WRITES=false",
    "--env-var", "CORS_ORIGIN="
  )
  if ($Region) { $cliArgs += @("--region", $Region) }
  if ($mongoUri) { $cliArgs += @("--env-var", "MONGO_URI=$mongoUri") }
  $cliArgs += @("--confirm", "--output", "json")

  $out = & render @cliArgs
  if ($LASTEXITCODE -ne 0) { Fail "Service creation failed. Check the output above (is the GitHub repo connected to Render?)." }
  try {
    $svc = $out | ConvertFrom-Json
    $url = $svc.serviceDetails.url; if (-not $url) { $url = $svc.url }
    if (-not $url) { $url = "https://$ServiceName.onrender.com" }
  } catch { $url = "https://$ServiceName.onrender.com" }
}

Write-Host ""
Write-Host "Done. Service '$ServiceName' is deploying." -ForegroundColor Green
if ($url) { Write-Host "URL: $url" -ForegroundColor Green }
Write-Host "Health: $url/api/health" -ForegroundColor Green
Write-Host "Watch logs: render logs $ServiceName" -ForegroundColor DarkGray
if (-not $mongoUri) {
  Write-Host "Reminder: set MONGO_URI in the Render dashboard and whitelist Render IPs in MongoDB Atlas." -ForegroundColor Yellow
}
