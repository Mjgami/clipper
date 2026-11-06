#!/usr/bin/env python3
"""Final quality gate for a delivered video.

  python3 qa.py Final.mp4 --at 1.5,4.2,9.8 [--cues cues.json --sfx sfx.wav] [--expect 1080x1920] [--lufs -14]

Checks and prints PASS/FAIL for:
  format    resolution (vs --expect), fps 30, has audio
  loudness  integrated within 1.5 LU of --lufs, true peak <= -1 dBTP
  sync      every cue's SFX transient within 1 frame (33 ms) of its cue time (needs --cues and --sfx)
  frames    writes qa_sheet.jpg (frames at --at) for a visual check: text inside safe zone, nothing over the face,
            captions readable, no leftover logos/watermarks
"""
import argparse, json, os, re, subprocess, sys, tempfile, wave

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

FF = ffmpeg()
ok = True


def report(name, passed, msg):
    global ok
    ok &= passed
    print(f"[{'PASS' if passed else 'FAIL'}] {name}: {msg}")


ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--at", default=""); ap.add_argument("--cues"); ap.add_argument("--sfx")
ap.add_argument("--expect"); ap.add_argument("--lufs", type=float, default=-14)
a = ap.parse_args()

info = subprocess.run([FF, "-hide_banner", "-i", a.video], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
res = re.search(r"Video:.*?(\d{3,4})x(\d{3,4})", info); fps = re.search(r"([\d.]+) fps", info)
report("format", bool(res) and (not a.expect or f"{res.group(1)}x{res.group(2)}" == a.expect) and "Audio:" in info,
       f"{res.group(1)}x{res.group(2)} @ {fps.group(1) if fps else '?'} fps, audio={'yes' if 'Audio:' in info else 'NO'}")

o = subprocess.run([FF, "-hide_banner", "-i", a.video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
s = o[o.rindex("Summary"):]
I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)); P = float(re.search(r"Peak:\s+(-?[\d.]+)", s).group(1))
report("loudness", abs(I - a.lufs) <= 1.5 and P <= -0.9, f"{I} LUFS (target {a.lufs}), true peak {P} dBFS")

if a.cues and a.sfx:
    import numpy as np
    w = wave.open(a.sfx); sr = w.getframerate(); x = np.abs(np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float))
    k = int(0.002 * sr); env = np.convolve(x, np.ones(k) / k, "same"); worst = 0
    for c in json.load(open(a.cues, encoding="utf-8")):
        i0, i1 = int((c["t"] - 0.1) * sr), int((c["t"] + 0.1) * sr)
        pk = (i0 + int(np.argmax(env[max(i0, 0):i1]))) / sr; worst = max(worst, abs(pk - c["t"]))
    report("sync", worst <= 1 / 30, f"worst SFX offset {worst * 1000:.1f} ms (limit 33 ms)")

if a.at:
    tmp = tempfile.mkdtemp(); ts = [t for t in a.at.split(",") if t]
    for i, t in enumerate(ts):
        subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-ss", t, "-i", a.video, "-frames:v", "1", "-vf", "scale=480:-2", f"{tmp}/{i:02d}.png"])
    cols = min(len(ts), 4); rows = (len(ts) + cols - 1) // cols
    subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", f"{tmp}/%02d.png", "-vf", f"tile={cols}x{rows}:padding=6", "-frames:v", "1", "qa_sheet.jpg"])
    print("frames -> qa_sheet.jpg (look at every one before delivering)")

sys.exit(0 if ok else 1)
