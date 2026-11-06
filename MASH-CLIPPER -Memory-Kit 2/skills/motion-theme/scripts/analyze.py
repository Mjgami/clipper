#!/usr/bin/env python3
"""Design a theme from footage when the user gives no colors/fonts.

  python3 analyze.py <video> --style real-estate [--out theme.json] [--accent "#hex"] [--fonts "Serif|Sans"]

Samples 10 frames and measures:
  light   : mean luma (bright / mid / dark) and colour temperature (warm / neutral / cool)
  frame   : dominant colours, busy vs clean background, emptiest 3x3 regions (where headlines can go)
Then picks text colour, accent (contrasting the frame's dominant hue), negative colour and a serif + bold-sans pair
from the style's mood. Prints a short report and writes theme.json (css tokens + notes) for new_project.py.
"""
import argparse, colorsys, json, os, subprocess, sys, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

MOODS = {  # style -> (mood, serif, sans, default accent family)
    "saas": ("tech", "Instrument Serif", "Inter Tight", "cool"),
    "motion-explainer": ("tech", "Instrument Serif", "Inter Tight", "cool"),
    "vox": ("editorial", "DM Serif Display", "Inter Tight", "warm"),
    "ali-abdaal": ("clean", "Instrument Serif", "Poppins", "cool"),
    "real-estate": ("luxury", "Playfair Display", "Inter Tight", "warm"),
    "construction": ("industrial", "Playfair Display", "Anton", "warm"),
    "gadzhi": ("luxury", "Playfair Display", "Inter Tight", "warm"),
    "bold-impact": ("bold", "Playfair Display", "Montserrat", "warm"),
    "podcast": ("bold", "Instrument Serif", "Inter Tight", "cool"),
    "finance": ("tech", "Instrument Serif", "Inter Tight", "cool"),
    "talking-head": ("clean", "Instrument Serif", "Inter Tight", "warm"),
}
ACCENTS = {  # family -> candidates (hex) ; we pick the one farthest in hue from the frame
    "warm": ["#ffc24b", "#e8b04a", "#ff7a3d", "#ffd400"],
    "cool": ["#2b4bff", "#1ec8ff", "#6f86ff", "#3ef0b0"],
}


def frames(video, n=10):
    tmp = tempfile.mkdtemp()
    dur = 0.0
    r = subprocess.run([ffmpeg(), "-hide_banner", "-i", video], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
    for tok in r.split("Duration: ")[1:2]:
        h, m, s = tok.split(",")[0].split(":"); dur = int(h) * 3600 + int(m) * 60 + float(s)
    fps = n / max(dur, 1)
    subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-i", video, "-vf", f"fps={fps},scale=192:-2", os.path.join(tmp, "f%02d.png")], check=True)
    return [os.path.join(tmp, f) for f in sorted(os.listdir(tmp))]


def hue_dist(a, b):
    d = abs(a - b) % 1.0
    return min(d, 1 - d)


def hex_rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lum(rgb):
    def ch(c):
        c /= 255; return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def contrast(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)


def main():
    global avg
    ap = argparse.ArgumentParser()
    ap.add_argument("video"); ap.add_argument("--style", default="talking-head"); ap.add_argument("--out", default="theme.json")
    ap.add_argument("--accent"); ap.add_argument("--fonts")
    a = ap.parse_args()
    from PIL import Image, ImageStat
    fs = frames(a.video)
    lumas, temps, hues, busy, cells = [], [], [], [], [[0.0] * 3 for _ in range(3)]
    pal = {}
    for f in fs:
        im = Image.open(f).convert("RGB"); st = ImageStat.Stat(im)
        r, g, b = st.mean; lumas.append(0.299 * r + 0.587 * g + 0.114 * b); temps.append(r - b)
        q = im.quantize(6).convert("RGB")
        for cnt, col in q.getcolors(64):
            pal[col] = pal.get(col, 0) + cnt
        busy.append(sum(ImageStat.Stat(im.convert("L")).stddev))
        W, H = im.size
        for i in range(3):
            for j in range(3):
                cell = im.convert("L").crop((j * W // 3, i * H // 3, (j + 1) * W // 3, (i + 1) * H // 3))
                cells[i][j] += ImageStat.Stat(cell).stddev[0] / len(fs)
    L = sum(lumas) / len(lumas); T = sum(temps) / len(temps); B = sum(busy) / len(busy)
    dom = sorted(pal.items(), key=lambda kv: -kv[1])[:5]
    for col, _ in dom:
        hh, ll, ss = colorsys.rgb_to_hls(*[c / 255 for c in col])
        if ss > 0.12: hues.append(hh)
    light = "bright" if L > 150 else "dark" if L < 85 else "mid"
    temp = "warm" if T > 12 else "cool" if T < -8 else "neutral"
    mood, serif, sans, fam = MOODS.get(a.style, MOODS["talking-head"])
    if temp == "warm" and fam == "cool" and a.style not in ("saas", "finance"): fam = "cool"  # contrast warm footage
    cands = ACCENTS[fam] + ACCENTS["cool" if fam == "warm" else "warm"][:1]
    def score(h):
        hh = colorsys.rgb_to_hls(*[c / 255 for c in hex_rgb(h)])[0]
        return min([hue_dist(hh, x) for x in hues] or [0.5])
    # the accent must also read against the frame itself (big key words often sit on the background)
    avg = tuple(int(sum(c[i] * n for c, n in dom) / sum(n for _, n in dom)) for i in range(3))
    readable = [c for c in cands + ["#2b4bff", "#c2410c", "#7b3ff2", "#0f9d58"] if contrast(hex_rgb(c), avg) >= 3.0]
    accent = a.accent or max(readable or cands, key=score)
    text = "#f5f2ea" if light != "bright" else "#ffffff"
    empty = sorted(((cells[i][j], ["top", "middle", "bottom"][i] + "-" + ["left", "center", "right"][j]) for i in range(3) for j in range(3)))[:3]
    if a.fonts:
        serif, sans = a.fonts.split("|")
    r, g, b = hex_rgb(accent)
    theme = {
        "style": a.style, "mood": mood,
        "footage": {"light": light, "temperature": temp, "busy": round(B, 1), "dominant": ["#%02x%02x%02x" % c for c, _ in dom], "emptiest_regions": [e[1] for e in empty]},
        "css": {"text": text, "accent": accent, "cap-color": cap_color(accent), "accent-glow": f"rgba({r},{g},{b},0.5)", "neg": "#ff4a5a", "display": f'"{sans}", sans-serif', "serif": f'"{serif}", serif'},
        "notes": [
            "Bright footage: add the bottom scrim (.mk-scrim) under captions and use pills/dark glass for cards." if light == "bright" else "Dark/mid footage: bare text with glow reads well.",
            f"Put headlines in: {', '.join(e[1] for e in empty)} (least detail). Never over the face.",
            "Busy background: give text a pill or card." if B > 150 else "Clean background: bare text is fine.",
            f"Accent {accent} contrasts the frame's dominant colours; negatives (hope/waiting/weeks) in {theme_neg()}.",
        ],
    }
    json.dump(theme, open(a.out, "w", encoding="utf-8"), indent=2)
    print(json.dumps({k: theme[k] for k in ("footage", "css")}, indent=2)); print("\n".join("- " + n for n in theme["notes"]))
    print(f"accent contrast vs the frame: {contrast(hex_rgb(accent), avg):.1f}:1 (need >= 3)")


def cap_color(h):
    """Caption key words sit on the dark scrim: lift the accent until it reads at >= 4.5:1 on near-black."""
    r, g, b = hex_rgb(h); k = 0.0
    while contrast((int(r + (255 - r) * k), int(g + (255 - g) * k), int(b + (255 - b) * k)), (20, 20, 20)) < 4.5 and k < 0.9:
        k += 0.05
    return "#%02x%02x%02x" % (int(r + (255 - r) * k), int(g + (255 - g) * k), int(b + (255 - b) * k))


def theme_neg():
    return "#ff4a5a"


if __name__ == "__main__":
    main()
