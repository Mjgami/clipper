#!/bin/bash
# MASH Editing Memory Kit installer (Mac / Linux). Safe to run again. Backs up any skill it replaces.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.claude/skills"; BK="$HOME/.claude/skills-backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEST" "$HOME/.claude"
for s in "$HERE/skills/"*/; do
  name="$(basename "$s")"
  if [ -d "$DEST/$name" ]; then mkdir -p "$BK"; mv "$DEST/$name" "$BK/"; fi
  cp -R "$s" "$DEST/$name"
done
echo "Installed $(ls "$HERE/skills" | wc -l | tr -d ' ') skills into $DEST"
[ -d "$BK" ] && echo "Older copies backed up in $BK"
# brand template + studio kit
mkdir -p "$HOME/.claude/motion-kit/brands" && cp -R "$HERE/brands/_template" "$HOME/.claude/motion-kit/brands/" 2>/dev/null || true
if [ ! -d "$HOME/MASH-Studio-Kit" ]; then cp -R "$HERE/studio-kit" "$HOME/MASH-Studio-Kit"; echo "Studio kit copied to ~/MASH-Studio-Kit (run: cd ~/MASH-Studio-Kit && npm install)"; fi
# make Claude load the memory automatically
CM="$HOME/.claude/CLAUDE.md"; touch "$CM"
if ! grep -q "MASH-EDITING-KIT:BEGIN" "$CM"; then printf '\n' >> "$CM"; cat "$HERE/CLAUDE_BLOCK.md" >> "$CM"; echo "Added the memory pointer to $CM"; fi
bash "$DEST/mash-clipper/scripts/setup.sh"
echo; echo "Done. Open Claude Code and say:  use MASH Clipper on <video link>"
