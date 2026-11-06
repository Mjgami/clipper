"""Pull a Mash BG palette out of the footage, so backgrounds match the shot's light.

  python3 palette.py clip.mp4 [--at 3.5] [--k 5] [--out palette.json]

Grabs one frame, clusters its colours (pure Python, no extra installs) and writes:
  {"colors": [base, c1, c2, accent], "base": ..., "accent": ..., "all": [...]}
base = darkest tone (background), accent = most saturated bright tone. Pass "colors" straight to MP.bg / MP.bgSwitch.
"""
import argparse, colorsys, json, os, subprocess, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

W, H = 64, 36


def frame_pixels(src, at):
    cmd = [ffmpeg(), "-v", "error", "-ss", str(at), "-i", src, "-frames:v", "1", "-vf", f"scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return [tuple(raw[i:i + 3]) for i in range(0, len(raw) - 2, 3)]


def kmeans(px, k, iters=12):
    px_sorted = sorted(px, key=lambda p: sum(p))
    cents = [px_sorted[int((i + 0.5) * len(px) / k)] for i in range(k)]  # deterministic seeds across brightness
    for _ in range(iters):
        groups = [[] for _ in cents]
        for p in px:
            j = min(range(len(cents)), key=lambda c: sum((a - b) ** 2 for a, b in zip(p, cents[c])))
            groups[j].append(p)
        cents = [tuple(sum(c) / len(g) for c in zip(*g)) if g else cents[i] for i, g in enumerate(groups)]
    return [(c, len(g)) for c, g in zip(cents, groups) if g]


def hexc(c):
    return "#" + "".join(f"{int(round(v)):02x}" for v in c)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--at", type=float, default=1.0)
    ap.add_argument("--k", type=int, default=5)
    ap.add_argument("--out", default="palette.json")
    a = ap.parse_args()
    clusters = kmeans(frame_pixels(a.src, a.at), a.k)
    hls = lambda c: colorsys.rgb_to_hls(*(v / 255 for v in c))
    by_dark = sorted(clusters, key=lambda x: hls(x[0])[1])
    base_c = by_dark[0][0]
    base = hexc(tuple(v * 0.45 for v in base_c))  # deeper than the shot so text pops
    rest = [c for c, _ in by_dark[1:]]

    def vivid(c):
        h, l, s = hls(c)
        r, g, b = colorsys.hls_to_rgb(h, min(0.62, max(0.42, l)), min(1, s * 1.35 + 0.1))
        return (r * 255, g * 255, b * 255)

    ranked = sorted(rest, key=lambda c: hls(c)[2] * (1 - abs(hls(c)[1] - 0.5)), reverse=True)
    accent = hexc(vivid(ranked[0])) if ranked else "#ffffff"
    mids = [hexc(vivid(c)) for c in ranked[1:3]] or [accent]
    out = {"colors": [base] + mids + [accent], "base": base, "accent": accent, "all": [hexc(c) for c, _ in clusters]}
    json.dump(out, open(a.out, "w"), indent=1)
    print(json.dumps(out))


if __name__ == "__main__":
    main()
