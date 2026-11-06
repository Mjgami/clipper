#!/bin/bash
# fetch.sh <youtube-or-other-link | local file path> <project dir>
# -> <project>/source.mp4 (best quality, original audio) + source.json (title, duration)
set -e
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$1"; PROJ="$2"
[ -z "$SRC" ] || [ -z "$PROJ" ] && { echo "usage: fetch.sh <link-or-path> <project dir>"; exit 1; }
mkdir -p "$PROJ"
LOCAL="${SRC/#\~/$HOME}"
if [ -f "$LOCAL" ]; then
  TITLE="$(basename "${LOCAL%.*}")"
  ext="${LOCAL##*.}"
  if [ "$(echo "$ext" | tr A-Z a-z)" = "mp4" ]; then cp "$LOCAL" "$PROJ/source.mp4"
  else ffmpeg -v error -y -i "$LOCAL" -map 0:v:0 -map 0:a:0? -c copy "$PROJ/source.mp4" 2>/dev/null || \
       ffmpeg -v error -y -i "$LOCAL" -c:v libx264 -crf 14 -preset medium -c:a copy "$PROJ/source.mp4"; fi
else
  "$SKILL_DIR/.venv/bin/python" -m yt_dlp -q --no-playlist --js-runtimes node \
    -f "bv*[vcodec^=avc1]+ba[ext=m4a]/bv*+ba/b" --merge-output-format mp4 \
    -o "$PROJ/source.%(ext)s" "$SRC"
  TITLE="$("$SKILL_DIR/.venv/bin/python" -m yt_dlp --no-playlist --js-runtimes node --print title "$SRC" 2>/dev/null | head -1)"
  # the platform's own captions (original language) - the reliable text for non-English / mixed-language videos
  "$SKILL_DIR/.venv/bin/python" -m yt_dlp -q --no-playlist --js-runtimes node --skip-download --write-auto-subs --write-subs \
    --sub-langs "orig,.*-orig,hi,en" --sub-format vtt -o "$PROJ/captions" "$SRC" 2>/dev/null || true
  [ -f "$PROJ/source.mp4" ] || { f=$(ls "$PROJ"/source.* | head -1); ffmpeg -v error -y -i "$f" -c:v libx264 -crf 14 -c:a aac -b:a 320k "$PROJ/source.mp4"; }
fi
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$PROJ/source.mp4")
WH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$PROJ/source.mp4")
printf '{"title": %s, "duration": %s, "size": "%s"}\n' "$(printf '%s' "$TITLE" | "$SKILL_DIR/.venv/bin/python" -c 'import json,sys;print(json.dumps(sys.stdin.read()))')" "$DUR" "$WH" > "$PROJ/source.json"
cat "$PROJ/source.json"
