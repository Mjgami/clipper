# MASH Editing Memory Kit installer (Windows PowerShell). Right-click > Run with PowerShell.
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $HOME ".claude\skills"; $bk = Join-Path $HOME (".claude\skills-backup\" + (Get-Date -Format yyyyMMdd-HHmmss))
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Get-ChildItem (Join-Path $here "skills") -Directory | ForEach-Object {
  $t = Join-Path $dest $_.Name
  if (Test-Path $t) { New-Item -ItemType Directory -Force -Path $bk | Out-Null; Move-Item $t $bk }
  Copy-Item $_.FullName $t -Recurse
}
$cm = Join-Path $HOME ".claude\CLAUDE.md"; if (-not (Test-Path $cm)) { New-Item -ItemType File -Path $cm | Out-Null }
if (-not (Select-String -Path $cm -Pattern "MASH-EDITING-KIT:BEGIN" -Quiet)) { Add-Content $cm ("`n" + (Get-Content (Join-Path $here "CLAUDE_BLOCK.md") -Raw)) }
Write-Host "Installed skills into $dest and added the memory pointer."
Write-Host "Run in Git Bash:  bash ~/.claude/skills/mash-clipper/scripts/setup.sh"
Write-Host "Then in Claude Code say:  use MASH Clipper on <video link>"
Read-Host "Press Enter to close"
