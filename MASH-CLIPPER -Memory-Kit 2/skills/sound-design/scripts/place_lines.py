#!/usr/bin/env python3
"""Trim TTS lines and lay them on a timeline with chosen pauses -> one voiceover WAV + line timings.

  python3 place_lines.py --gaps 0.25,0.3,0.15,0.3,0.7,0.12 --dur 15 --out vo_full.wav line_01.wav line_02.wav ...

--gaps: silence before each line (seconds). A longer gap before the brand line lets the logo reveal land.
Writes vo_full.wav and vo_marks.json (line_starts / line_ends) to drive the animation.
"""
import argparse, json, os, subprocess, sys, tempfile, wave
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

SR = 48000


def read(p):
    t = tempfile.mktemp(suffix=".wav")
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", p, "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", t], check=True)
    w = wave.open(t); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def trim(x, th=0.01):
    k = int(0.01 * SR); e = np.convolve(np.abs(x), np.ones(k) / k, "same"); idx = np.where(e > th)[0]
    return x[max(idx[0] - int(0.02 * SR), 0): min(idx[-1] + int(0.06 * SR), len(x))]


ap = argparse.ArgumentParser()
ap.add_argument("lines", nargs="+"); ap.add_argument("--gaps", required=True); ap.add_argument("--dur", type=float, default=0)
ap.add_argument("--out", default="vo_full.wav")
a = ap.parse_args()
gaps = [float(g) for g in a.gaps.split(",")]
t = 0; placed = []
for g, f in zip(gaps, a.lines):
    x = trim(read(f)); t += g; placed.append((t, x)); t += len(x) / SR
total = max(a.dur, t + 0.6)
y = np.zeros(int(total * SR))
for s, x in placed:
    i = int(s * SR); y[i:i + len(x)] += x
with wave.open(a.out, "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
marks = {"line_starts": [round(s, 3) for s, _ in placed], "line_ends": [round(s + len(x) / SR, 3) for s, x in placed], "total": round(total, 2)}
json.dump(marks, open(os.path.splitext(a.out)[0] + "_marks.json", "w", encoding="utf-8"))
print(marks)
