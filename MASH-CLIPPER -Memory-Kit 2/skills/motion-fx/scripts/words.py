#!/usr/bin/env python3
"""Word timings for an edit: transcribe (HyperFrames, on-device) and print a WORDS array to paste into the composition.

  python3 words.py <audio_or_video> [--start 0 --end 20] [--refine]

--refine snaps the first word after every pause to the real speech onset (ffmpeg silencedetect). ASR timestamps can
run 0.1-0.3 s early after a pause; animations that should land ON a word need the true onset.
Prints  const WORDS = [["Most",0,0.4],...];  and writes words.json next to the input.
"""
import argparse, json, os, re, shutil, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ff import ffmpeg  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("--start", type=float, default=0); ap.add_argument("--end", type=float)
ap.add_argument("--refine", action="store_true")
a = ap.parse_args()
tmp = tempfile.mkdtemp(); wav = os.path.join(tmp, "a.wav")
cmd = [ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-ss", str(a.start), "-i", a.src]
if a.end: cmd += ["-t", str(a.end - a.start)]
subprocess.run(cmd + ["-vn", "-ac", "1", "-ar", "16000", wav], check=True)
npx = shutil.which("npx") or shutil.which("npx.cmd") or "npx"  # npx.cmd on Windows
r = subprocess.run([npx, "--yes", "hyperframes", "transcribe", wav, "--json", "-d", tmp], capture_output=True, text=True, encoding="utf-8", errors="replace")
path = json.loads(r.stdout.strip().splitlines()[-1])["transcriptPath"]
words = [[w["text"], round(w["start"], 2), round(w["end"], 2)] for w in json.load(open(path, encoding="utf-8"))]
if a.refine:
    o = subprocess.run([ffmpeg(), "-hide_banner", "-i", wav, "-af", "silencedetect=n=-40dB:d=0.15", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    for se in [float(x) for x in re.findall(r"silence_end: ([\d.]+)", o)]:
        # the word nearest to the end of a pause starts at the real onset
        j = min(range(len(words)), key=lambda k: abs(words[k][1] - se))
        if abs(words[j][1] - se) < 0.45:
            words[j][1] = round(se + 0.02, 2)
out = os.path.splitext(a.src)[0] + ".words.json"
json.dump(words, open(out, "w", encoding="utf-8"))
print("const WORDS = " + json.dumps(words) + ";")
print("->", out, file=sys.stderr)
