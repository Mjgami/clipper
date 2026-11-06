#!/bin/bash
# MASH Clipper setup check. Prints READY when everything works, else the ONE fix to run.
SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fail() { echo "MISSING: $1"; echo "FIX: $2"; exit 1; }

command -v ffmpeg >/dev/null 2>&1 || fail "ffmpeg" "Mac: download the static build from https://evermeet.cx/ffmpeg/ , unzip, then run: mkdir -p ~/.local/bin && mv ~/Downloads/ffmpeg ~/Downloads/ffprobe ~/.local/bin/ && echo 'export PATH=\$HOME/.local/bin:\$PATH' >> ~/.zshrc   |  Windows: winget install Gyan.FFmpeg"
command -v ffprobe >/dev/null 2>&1 || fail "ffprobe" "install ffprobe next to ffmpeg (same download as ffmpeg)"
command -v node >/dev/null 2>&1 || fail "Node.js" "install Node 22 LTS from https://nodejs.org"
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || fail "Node 22+ (you have $NODE_MAJOR)" "install Node 22 LTS from https://nodejs.org"

UV=$(command -v uv || echo "$HOME/.local/bin/uv")
if [ ! -x "$UV" ]; then
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
  UV="$HOME/.local/bin/uv"
fi
[ -x "$UV" ] || fail "uv (Python manager)" "run: curl -LsSf https://astral.sh/uv/install.sh | sh"

if [ ! -x "$SKILL_DIR/.venv/bin/python" ]; then
  "$UV" venv --python 3.12 "$SKILL_DIR/.venv" >/dev/null 2>&1 || fail "Python 3.12" "run: $UV python install 3.12"
fi
"$SKILL_DIR/.venv/bin/python" -c "import yt_dlp, faster_whisper, cv2, numpy, PIL" 2>/dev/null || \
  "$UV" pip install --python "$SKILL_DIR/.venv/bin/python" -q yt-dlp faster-whisper "av>=14,<16" "opencv-python-headless<4.12" numpy pillow >/dev/null 2>&1
"$SKILL_DIR/.venv/bin/python" -c "import yt_dlp, faster_whisper, cv2, numpy, PIL" 2>/dev/null || fail "Python tools" "run: $UV pip install --python $SKILL_DIR/.venv/bin/python yt-dlp faster-whisper 'av>=14,<16' 'opencv-python-headless<4.12' numpy pillow"
chmod +x "$SKILL_DIR/scripts/"*.sh 2>/dev/null
echo "READY"
