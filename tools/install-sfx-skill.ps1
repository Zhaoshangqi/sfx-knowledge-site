param(
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Source = Join-Path $RepoRoot "skills\sfx-knowledge"
$CodexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME ".codex" }
$SkillsRoot = Join-Path $CodexRoot "skills"
$Target = Join-Path $SkillsRoot "sfx-knowledge"

if (-not (Test-Path -LiteralPath (Join-Path $Source "SKILL.md"))) {
  throw "Repository skill not found: $Source"
}

if (Test-Path -LiteralPath $Target) {
  $sourceFiles = Get-ChildItem -LiteralPath $Source -Recurse -File
  $same = $true
  foreach ($file in $sourceFiles) {
    $relative = $file.FullName.Substring($Source.Length).TrimStart("\")
    $installed = Join-Path $Target $relative
    if (-not (Test-Path -LiteralPath $installed)) {
      $same = $false
      break
    }
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file.FullName).Hash -ne (Get-FileHash -Algorithm SHA256 -LiteralPath $installed).Hash) {
      $same = $false
      break
    }
  }

  if ($same) {
    Write-Host "sfx-knowledge is already up to date: $Target"
    exit 0
  }

  if (-not $Force) {
    throw "An existing sfx-knowledge skill differs. Re-run with -Force to back it up and install the repository version."
  }

  $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $backupRoot = Join-Path $CodexRoot "skill-backups"
  $backup = Join-Path $backupRoot "sfx-knowledge-$stamp"
  New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null
  Copy-Item -LiteralPath $Target -Destination $backup -Recurse -Force
  Write-Host "Existing skill backed up to: $backup"
}

New-Item -ItemType Directory -Force -Path $SkillsRoot | Out-Null
New-Item -ItemType Directory -Force -Path $Target | Out-Null
Copy-Item -Path (Join-Path $Source "*") -Destination $Target -Recurse -Force
Write-Host "Installed sfx-knowledge skill to: $Target"
