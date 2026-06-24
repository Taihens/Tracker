<#
  Garde-fou handoff (CLAUDE.md §5) — hook Stop.
  Bloque la fin de tour SI un lot vient d'être marqué [CLOTURÉ] dans task.md /
  ROADMAP.md (arbre de travail vs HEAD) ET qu'aucun dossier handoff/handoffXX_*
  non-suivi n'existe encore. Force la génération du handoff avant clôture.
  Ne bloque jamais sur erreur (fail-open) ni en boucle (stop_hook_active).
#>
$ErrorActionPreference = 'SilentlyContinue'

try {
  $raw = [Console]::In.ReadToEnd()
  if ($raw) {
    $payload = $raw | ConvertFrom-Json
    # Anti-boucle : si on est déjà dans une relance déclenchée par ce hook, laisser passer.
    if ($payload.stop_hook_active -eq $true) { exit 0 }
  }

  # Racine du repo : .claude/hooks -> .claude -> racine
  $repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
  Set-Location $repo

  # Signal de clôture : une ligne AJOUTÉE contenant [CLOTURÉ] dans task.md ou la roadmap.
  $diff = git diff HEAD -- task.md 'RoadMap & Project Pipeline/ROADMAP.md' 2>$null
  $closure = $diff | Select-String -Pattern '^\+.*\[CLOTUR' -CaseSensitive:$false

  # Présence d'un handoff fraîchement généré (dossier handoff/handoffNN_* ou ZIP).
  # handoff/ est dans .gitignore → git status ne liste pas les sous-entrées ; on
  # vérifie directement le système de fichiers.
  $handoffDir = Join-Path $repo 'handoff'
  $hasHandoff = Get-ChildItem -Path $handoffDir -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^handoff\d' } | Select-Object -First 1

  if ($closure -and -not $hasHandoff) {
    [Console]::Error.WriteLine(
      "BLOQUE - Handoff manquant (CLAUDE.md §5). Un lot vient d'etre marque [CLOTURE] " +
      "mais aucun dossier handoff/handoffXX_* non-suivi n'existe. " +
      "Genere le handoff avant de clore : npm run handoff -- <num> <slug>")
    exit 2
  }
}
catch {
  # Fail-open : ne jamais piéger l'utilisateur sur une erreur du garde-fou.
  exit 0
}
exit 0
