<#
.SYNOPSIS
  Génère une archive de handoff conforme à CLAUDE.md §5.

.DESCRIPTION
  Produit un dossier horodaté handoff/handoffXX_nom/ contenant :
    - git_diff.patch     : diff complet vs la branche de base
    - git_status.txt     : état de l'arbre de travail
    - files_changed.txt  : liste des fichiers modifiés
    - test_results.txt   : sortie de `npm test`
    - build_log.txt      : sortie de `npm run build`
    - SUMMARY.md         : en-tête (branche, lot, date, commits)
  Puis zippe le tout en handoff/handoffXX_nom.zip.

.PARAMETER Numero
  Numéro du lot (ex: 04). Formaté sur 2 chiffres.

.PARAMETER Nom
  Slug court du handoff (ex: remediation-pipeline).

.PARAMETER Base
  Branche/réf de comparaison pour le diff. Défaut : main.

.EXAMPLE
  npm run handoff -- 04 remediation-pipeline
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Numero,

  [Parameter(Mandatory = $true, Position = 1)]
  [string]$Nom,

  [Parameter(Position = 2)]
  [string]$Base = 'main'
)

$ErrorActionPreference = 'Stop'

# Racine du repo (le script vit dans scripts/)
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$num = $Numero.PadLeft(2, '0')
$slug = "handoff${num}_${Nom}"
$outDir = Join-Path $repoRoot "handoff\$slug"
$zipPath = Join-Path $repoRoot "handoff\$slug.zip"

if (Test-Path $outDir) { Remove-Item $outDir -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
$stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$commitCount = (git rev-list --count "$Base..HEAD").Trim()

Write-Host "-> Handoff $slug (branche $branch vs $Base)" -ForegroundColor Cyan

# --- Artefacts git ---
# Diff vs $Base SANS HEAD : capture l'arbre de travail complet (commits + modifs
# NON commitees). Indispensable pour un handoff pris avant le commit du lot.
git diff "$Base"             | Out-File -Encoding utf8 (Join-Path $outDir 'git_diff.patch')
git status                   | Out-File -Encoding utf8 (Join-Path $outDir 'git_status.txt')
git diff --name-only "$Base" | Out-File -Encoding utf8 (Join-Path $outDir 'files_changed.txt')

# --- Tests (non bloquant) ---
# La redirection 2>&1 est traitee par cmd.exe (a l'interieur des guillemets),
# donc PowerShell ne wrappe pas la sortie en NativeCommandError (piege PS 5.1).
Write-Host '-> npm test' -ForegroundColor Cyan
cmd /c "npm test 2>&1" | Out-File -Encoding utf8 (Join-Path $outDir 'test_results.txt')
$testExit = $LASTEXITCODE

# --- Build (non bloquant) ---
Write-Host '-> npm run build' -ForegroundColor Cyan
cmd /c "npm run build 2>&1" | Out-File -Encoding utf8 (Join-Path $outDir 'build_log.txt')
$buildExit = $LASTEXITCODE

# --- Resume ---
$testStatus = if ($testExit -eq 0) { '[OK] vert' } else { "[ERR] echec (exit $testExit)" }
$buildStatus = if ($buildExit -eq 0) { '[OK] OK' } else { "[ERR] echec (exit $buildExit)" }

$summary = @"
# Handoff $num - $Nom

- **Branche** : $branch
- **Base de comparaison** : $Base
- **Date** : $stamp
- **Commits** ($Base..HEAD) : $commitCount
- **Tests** : $testStatus
- **Build** : $buildStatus

## Contenu
- git_diff.patch - diff complet vs $Base
- git_status.txt - etat de l'arbre
- files_changed.txt - fichiers modifies
- test_results.txt - sortie npm test
- build_log.txt - sortie npm run build
"@
$summary | Out-File -Encoding utf8 (Join-Path $outDir 'SUMMARY.md')

# --- Zip ---
Compress-Archive -Path "$outDir\*" -DestinationPath $zipPath -Force

Write-Host ''
Write-Host "[OK] Handoff genere : handoff\$slug.zip" -ForegroundColor Green
Write-Host "   Tests : $testStatus  |  Build : $buildStatus"
if ($testExit -ne 0 -or $buildExit -ne 0) {
  Write-Host '[WARN] Tests ou build en echec - verifie test_results.txt / build_log.txt avant de cloturer le lot.' -ForegroundColor Yellow
}
