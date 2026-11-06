"""Find the beat grid of a music track, for MP.beatShake / MP.beatFlash / MP.onBeats.

  python3 beats.py music.mp3 [--out beats.json] [--min-bpm 70] [--max-bpm 180]

ffmpeg decodes the audio; spectral-flux onsets (numpy, falls back to pure Python) -> tempo by autocorrelation -> beat phase that hits the
most onsets. Writes {"bpm": 120.0, "beats": [0.52, 1.02, ...], "downbeats": [every 4th beat]}.
"""
import argparse, array, json, math, os, subprocess, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

SR, HOP = 11025, 128


def onset_envelope(src):
    raw = subprocess.run([ffmpeg(), "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    x = array.array("h"); x.frombytes(raw[: len(raw) // 2 * 2])
    if sys.byteorder == "big":
        x.byteswap()
    try:  # spectral flux: catches pitched notes (plucks, keys) as well as drums
        import numpy as np
        y = np.frombuffer(x.tobytes(), dtype=np.int16).astype(np.float32) / 32768
        nfft = 1024; nfr = max(0, (len(y) - nfft) // HOP)
        idx = np.arange(nfft)[None, :] + HOP * np.arange(nfr)[:, None]
        mag = np.log1p(100 * np.abs(np.fft.rfft(y[idx] * np.hanning(nfft), axis=1)))
        flux = np.maximum(0, np.diff(mag, axis=0)).sum(axis=1)
        env = [0.0] + flux.tolist()
        lat = 0.72 * nfft / SR  # measured: hann-window flux peaks ~67 ms after the frame start
    except ImportError:  # no numpy: high-passed + full-band energy flux
        lat = HOP / 2 / SR
        n = len(x) // HOP
        env, prev_h, prev_f, prev_s = [], 0.0, 0.0, 0
        for i in range(n):
            h = f = 0.0
            for s in x[i * HOP:(i + 1) * HOP]:
                d = s - prev_s; prev_s = s; h += d * d; f += s * s
            h, f = math.log1p(h / HOP), math.log1p(f / HOP)
            env.append(max(0.0, h - prev_h) + max(0.0, f - prev_f)); prev_h, prev_f = h, f
    m = sum(env) / max(1, len(env))
    return [v - m if v > m else 0.0 for v in env], len(x) / SR, lat


def tempo(env, lo, hi):
    """Beat period (in envelope frames) that best explains the onsets: normalised autocorrelation sampled at
    1x..4x the candidate period (a comb), with a mild preference for ~110 bpm to settle half/double ambiguity."""
    fps = SR / HOP
    maxL = int(4 * fps * 60 / lo) + 2
    n = len(env)
    ac = [0.0] * (maxL + 1)
    for L in range(1, min(maxL, n - 1) + 1):
        ac[L] = sum(env[i] * env[i - L] for i in range(L, n)) / (n - L)
    acI = lambda x: 0.0 if x >= maxL else ac[int(x)] + (ac[int(x) + 1] - ac[int(x)]) * (x - int(x))
    best, best_lag = -1, None
    for bpm10 in range(lo * 10, hi * 10 + 1, 2):
        bpm = bpm10 / 10; lag = fps * 60 / bpm
        sc = acI(lag) + 0.5 * acI(2 * lag) + 0.5 * acI(3 * lag) + 0.25 * acI(4 * lag)
        sc *= math.exp(-0.5 * (math.log2(bpm / 110) / 0.9) ** 2)
        if sc > best:
            best, best_lag = sc, lag
    return best_lag


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="beats.json")
    ap.add_argument("--min-bpm", type=int, default=70)
    ap.add_argument("--max-bpm", type=int, default=180)
    a = ap.parse_args()
    env, dur, lat = onset_envelope(a.src)
    fps = SR / HOP
    lag = tempo(env, a.min_bpm, a.max_bpm)
    phases = [sum(env[int(round(p + k * lag))] for k in range(int((len(env) - p) / lag))) for p in range(int(lag))]
    p0 = max(range(len(phases)), key=phases.__getitem__)
    beats = [round((p0 + k * lag) / fps, 3) for k in range(int((len(env) - p0) / lag))]
    # snap each beat to the strongest onset within +-2 frames (~23 ms) so it lands on the actual transient
    snapped = []
    for b in beats:
        i = int(round(b * fps)); w = range(max(0, i - 2), min(len(env), i + 3))
        j = max(w, key=env.__getitem__) if any(env[k] > 0 for k in w) else i
        snapped.append(round(j / fps + lat, 3))
    out = {"bpm": round(60 * fps / lag, 1), "duration": round(dur, 2), "beats": snapped, "downbeats": snapped[::4]}
    json.dump(out, open(a.out, "w"))
    print(f"{out['bpm']} bpm, {len(snapped)} beats over {dur:.1f}s -> {a.out}")


if __name__ == "__main__":
    main()
