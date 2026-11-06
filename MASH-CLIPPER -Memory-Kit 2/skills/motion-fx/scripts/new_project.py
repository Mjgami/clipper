#!/usr/bin/env python3
"""Scaffold a MotionKit HyperFrames project.

  python3 new_project.py <dir> --aspect 9:16|16:9|1:1 --duration 15 [--theme theme.json] [--video clip.mp4]

Creates <dir>/index.html (one paused timeline, MotionKit loaded, theme tokens applied),
copies motionkit.js/.css, creatorfx.js/.css, mashpro.js + noise.png, downloads GSAP and the free fonts once into a cache.
"""
import argparse, json, os, shutil, sys, urllib.request, random

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "..", "assets")
MASH = os.path.join(HERE, "..", "..", "mash-pro", "assets")  # Mash Pro effects pack, installed next to motion-fx
CACHE = os.path.expanduser("~/.cache/motionkit")
GSAP = ("gsap.min.js", "https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js")
FONTS = {  # all SIL Open Font License, safe to ship with renders
    "InterTight.ttf": "https://github.com/google/fonts/raw/main/ofl/intertight/InterTight%5Bwght%5D.ttf",
    "InstrumentSerif-Italic.ttf": "https://github.com/google/fonts/raw/main/ofl/instrumentserif/InstrumentSerif-Italic.ttf",
    "JetBrainsMono.ttf": "https://github.com/google/fonts/raw/main/ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf",
    "PlayfairDisplay-Italic.ttf": "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf",
    "Montserrat.ttf": "https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    "Anton.ttf": "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf",
    "Poppins-Bold.ttf": "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf",
    "DMSerifDisplay-Italic.ttf": "https://github.com/google/fonts/raw/main/ofl/dmserifdisplay/DMSerifDisplay-Italic.ttf",
}
SIZES = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080), "4:5": (1080, 1350)}


def fetch(name, url):
    os.makedirs(CACHE, exist_ok=True)
    p = os.path.join(CACHE, name)
    if not os.path.exists(p) or os.path.getsize(p) < 1000:
        print("downloading", name)
        urllib.request.urlretrieve(url, p)
    return p


def noise_png(path):
    try:
        from PIL import Image
    except ImportError:
        print("Pillow not installed: skipping grain texture (pip install pillow)"); return
    random.seed(3)
    im = Image.new("L", (512, 512)); im.putdata([random.randint(0, 255) for _ in range(512 * 512)]); im.save(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("dir"); ap.add_argument("--aspect", default="9:16"); ap.add_argument("--duration", type=float, default=15)
    ap.add_argument("--theme"); ap.add_argument("--video"); ap.add_argument("--title", default="MotionKit Edit")
    a = ap.parse_args()
    W, H = SIZES[a.aspect]
    d = os.path.abspath(a.dir); os.makedirs(os.path.join(d, "fonts"), exist_ok=True)
    for f in ("motionkit.js", "motionkit.css", "creatorfx.js", "creatorfx.css"):
        shutil.copy(os.path.join(ASSETS, f), d)
    mash = os.path.isfile(os.path.join(MASH, "mashpro.js"))
    if mash:
        for f in ("mashworld.js", "mashpro.js"):
            shutil.copy(os.path.join(MASH, f), d)
    shutil.copy(fetch(*GSAP), d)
    for n, u in FONTS.items():
        shutil.copy(fetch(n, u), os.path.join(d, "fonts", n))
    noise_png(os.path.join(d, "noise.png"))
    theme = json.load(open(a.theme, encoding="utf-8")) if a.theme else {}
    toks = "".join(f"--mk-{k}: {v}; " for k, v in theme.get("css", {}).items())
    faces = "\n".join(
        f'      @font-face {{ font-family: "{fam}"; src: url("fonts/{f}") format("truetype"); {extra}}}'
        for fam, f, extra in [
            ("Inter Tight", "InterTight.ttf", "font-weight: 100 900; "), ("Instrument Serif", "InstrumentSerif-Italic.ttf", "font-style: italic; "),
            ("JetBrains Mono", "JetBrainsMono.ttf", "font-weight: 100 800; "), ("Playfair Display", "PlayfairDisplay-Italic.ttf", "font-style: italic; font-weight: 400 900; "),
            ("Montserrat", "Montserrat.ttf", "font-weight: 100 900; "), ("Anton", "Anton.ttf", ""), ("Poppins", "Poppins-Bold.ttf", "font-weight: 700; "),
            ("DM Serif Display", "DMSerifDisplay-Italic.ttf", "font-style: italic; ")])
    video = ""
    if a.video:
        shutil.copy(a.video, os.path.join(d, os.path.basename(a.video)))
        video = (f'      <div class="mk-cam" id="cam">\n        <video id="src" src="{os.path.basename(a.video)}" data-start="0" '
                 f'data-duration="{a.duration}" data-track-index="0" muted playsinline></video>\n      </div>\n')
    mash_tags = '    <script src="mashworld.js"></script>\n    <script src="mashpro.js"></script>\n' if mash else ""
    mash_init = f"      const MP = MashPro(tl, {{ fps: 30, width: {W} }});  // Mash Pro: see mash-pro/SKILL.md\n" if mash else ""
    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width={W}, height={H}" />
    <title>{a.title}</title>
    <script src="gsap.min.js"></script>
    <script src="motionkit.js"></script>
    <script src="creatorfx.js"></script>
{mash_tags}    <link rel="stylesheet" href="motionkit.css" />
    <link rel="stylesheet" href="creatorfx.css" />
    <style>
{faces}
      :root {{ {toks}}}
      body {{ margin: 0; background: var(--mk-bg); }}
      #root {{ position: relative; width: 100%; height: 100%; overflow: hidden; background: var(--mk-bg); font-family: var(--mk-display); color: var(--mk-text); }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-width="{W}" data-height="{H}" data-duration="{a.duration}">
{video}      <div class="mk-layer" id="front"></div>
      <div class="mk-caps" id="caps"></div>
    </div>
    <script>
      const tl = gsap.timeline({{ paused: true }});
      const MK = MotionKit(tl, {{ fps: 30 }});
      const CF = CreatorFX(tl, {{ root: "#root", fps: 30 }});
{mash_init}      // build the edit here (motion-fx/references/effects.md + creator-effects.md)
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
    open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(html)
    print(f"project ready: {d}  ({W}x{H}, {a.duration}s)")


if __name__ == "__main__":
    sys.exit(main())
