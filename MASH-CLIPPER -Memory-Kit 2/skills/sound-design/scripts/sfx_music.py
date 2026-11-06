#!/usr/bin/env python3
"""Code-generated SFX on visual impact frames + a soft music bed. No samples, no licences needed.

  python3 sfx_music.py --cues cues.json --dur 16.6 --out audio/ [--bpm 104] [--mood calm|tech|warm] [--sfx-db -17]

cues.json: [{"t": 2.4, "cue": "hit", "fx": "what it syncs to"}, ...]
cue types: pop, click, whoosh, swipe, hit, shimmer.
Rules baked in: every SFX peaks at --sfx-db (default -17 dBFS); each sound's transient (its loudest point)
is placed exactly on the cue time, so build-ups (whoosh, swipe) start early and peak ON the frame.
Writes sfx.wav and music_raw.wav (mix.py sets the music level under the voice).
"""
import argparse, json, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--cues", required=True); ap.add_argument("--dur", type=float, required=True); ap.add_argument("--out", default=".")
ap.add_argument("--bpm", type=float, default=96); ap.add_argument("--mood", default="warm"); ap.add_argument("--sfx-db", type=float, default=-17.0)
A = ap.parse_args()
SR = 48000
DUR = A.dur
OUT = A.out

def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))

def bandnoise(n, lo, hi, seed):
    r = np.random.default_rng(seed)
    spec = np.fft.rfft(r.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n)
    return x / (np.max(np.abs(x)) + 1e-9)

def sweep_noise(n, f0, f1, seed):
    # noise through a moving band: crossfade 12 bands along the sweep
    out = np.zeros(n)
    bands = np.geomspace(f0, f1, 12)
    seg = np.linspace(0, 1, n)
    for i, fc in enumerate(bands):
        b = bandnoise(n, fc * 0.7, fc * 1.4, seed + i)
        w = np.exp(-((seg - i / 11) ** 2) / 0.02)
        out += b * w
    return out

def pop(v):
    n = int(0.12 * SR); t = np.arange(n) / SR
    f = (520 + 60 * v) * np.exp(-t * 30) + 180
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.035)
    s[:200] += bandnoise(200, 2000, 8000, v) * 0.3
    return s

def click(v):
    n = int(0.06 * SR)
    s = bandnoise(n, 2500 + 300 * v, 7000, 10 + v) * env_exp(n, 0.006)
    t = np.arange(n) / SR
    s += 0.5 * np.sin(2 * np.pi * (1700 + 120 * v) * t) * env_exp(n, 0.012)
    return s

def whoosh(v, length=0.42, peak=0.32):
    n = int(length * SR); t = np.arange(n) / SR
    s = sweep_noise(n, 300 + 50 * v, 4000, 20 + v)
    e = np.where(t < peak, (t / peak) ** 2.2, np.exp(-(t - peak) / 0.04))
    return s * e

def swipe(v):
    return whoosh(v, length=0.24, peak=0.16)

def hit(v):
    n = int(0.5 * SR); t = np.arange(n) / SR
    f = 95 * np.exp(-t * 6) + 45
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.16)
    s += bandnoise(n, 1500, 9000, 30 + v) * env_exp(n, 0.02) * 0.35
    return s

def shimmer(v):
    n = int(0.7 * SR); t = np.arange(n) / SR
    s = np.zeros(n)
    for k, f in enumerate([2093, 2637, 3136, 4186]):
        s += np.sin(2 * np.pi * (f + 7 * v) * t + k) * env_exp(n, 0.25) * (1 + 0.4 * np.sin(2 * np.pi * (9 + k) * t))
    s[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))
    return s

GEN = {"pop": pop, "click": click, "whoosh": whoosh, "swipe": swipe, "hit": hit, "shimmer": shimmer}

def transient(x):
    # loudest point of a 2 ms smoothed envelope
    k = int(0.002 * SR)
    e = np.convolve(np.abs(x), np.ones(k) / k, mode="same")
    return int(np.argmax(e))

def norm_peak(x, dbfs):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (dbfs / 20)

cues = json.load(open(A.cues, encoding="utf-8"))
N = int(DUR * SR)
sfx = np.zeros(N)
counts = {}
report = []
for c in cues:
    kind = c["cue"]; v = counts.get(kind, 0) % 3; counts[kind] = counts.get(kind, 0) + 1
    s = norm_peak(GEN[kind](v), A.sfx_db)
    off = transient(s)
    start = int(round(c["t"] * SR)) - off
    a, b = max(start, 0), min(start + len(s), N)
    sfx[a:b] += s[a - start : b - start]
    report.append((c["t"], kind, (start + off) / SR))

# soft music bed: warm pad + gentle pluck, 92 BPM, Cmaj7 Am7 Fmaj7 G6
bpm = A.bpm; beat = 60 / bpm
CHORDS = {
    "warm": [[48, 55, 59, 64], [45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59]],   # Cmaj7 Am7 Fmaj7 G6
    "tech": [[45, 52, 55, 60], [41, 48, 52, 57], [43, 50, 55, 59], [40, 47, 52, 55]],   # Am7 Fmaj7 G6 Em7
    "calm": [[50, 57, 61, 66], [47, 54, 57, 62], [43, 50, 54, 59], [45, 52, 57, 61]],   # Dmaj7 Bm7 Gmaj7 A
}
chords = CHORDS.get(A.mood, CHORDS["warm"])
mus = np.zeros(N); t = np.arange(N) / SR
bar = 4 * beat
for i in range(int(DUR / bar) + 2):
    ch = chords[i % 4]; a = int(i * bar * SR); b = min(int((i + 1) * bar * SR) + int(0.4 * SR), N)
    if a >= N: break
    tt = np.arange(b - a) / SR
    env = np.minimum(1, tt / 0.6) * np.minimum(1, (b - a - np.arange(b - a)) / SR / 0.4)
    for m in ch:
        f = 440 * 2 ** ((m - 69) / 12)
        mus[a:b] += env * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * 2 * f * tt + 0.5)) * 0.25
    for k in range(8):  # eighth-note pluck arpeggio
        pa = a + int(k * beat / 2 * SR); pn = int(0.5 * SR)
        if pa + pn > N: break
        m = ch[[0, 2, 3, 2, 1, 3, 2, 3][k]] + 12
        f = 440 * 2 ** ((m - 69) / 12); pt = np.arange(pn) / SR
        mus[pa : pa + pn] += 0.18 * np.sin(2 * np.pi * f * pt) * np.exp(-pt / 0.18)
# soften: gentle low-pass via FFT
spec = np.fft.rfft(mus); f = np.fft.rfftfreq(N, 1 / SR); spec *= 1 / (1 + (f / 2500) ** 4); mus = np.fft.irfft(spec, N)
fade = np.ones(N); fi = int(0.5 * SR); fo = int(1.5 * SR)
fade[:fi] = np.linspace(0, 1, fi); fade[-fo:] = np.linspace(1, 0, fo)
mus *= fade

def write(path, x):
    y = np.clip(x, -1, 1)
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())

write(OUT + "/sfx.wav", sfx)
write(OUT + "/music_raw.wav", norm_peak(mus, -6))
for r in report:
    print(f"cue {r[0]:6.2f}s {r[1]:8s} transient placed at {r[2]:6.3f}s  (off {abs(r[2]-r[0])*1000:.1f} ms)")
