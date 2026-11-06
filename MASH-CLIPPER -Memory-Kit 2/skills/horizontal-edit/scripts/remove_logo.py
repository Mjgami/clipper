#!/usr/bin/env python3
"""Hide a static logo / sign / object in a LOCKED-OFF shot by cloning nearby background over it.

  python3 remove_logo.py <video> --box x0,y0,x1,y1 [--from above|below|left|right] [--at 5] [--out patch.png]

Coordinates are in the video's own pixels (use the size you composite at, e.g. 1920x1080 after upscaling).
Builds a feathered PNG patch from the background next to the box; place it in the composition inside the same
camera wrapper as the video:  <img src="patch.png" style="position:absolute;left:x0px;top:y0px">
so it zooms and punches in together with the footage. Writes patch_preview.png to check the result.
Only for tripod shots where nothing moves over the box. Edge watermarks are better cropped with a slight zoom.
"""
import argparse, os, subprocess, sys, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("video"); ap.add_argument("--box", required=True); ap.add_argument("--from", dest="src", default="above")
ap.add_argument("--at", default="1"); ap.add_argument("--out", default="patch.png"); ap.add_argument("--feather", type=int, default=16)
a = ap.parse_args()
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

plate = os.path.join(tempfile.mkdtemp(), "plate.png")
subprocess.run([ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-ss", a.at, "-i", a.video, "-frames:v", "1", plate], check=True)
pl = Image.open(plate).convert("RGB")
x0, y0, x1, y1 = map(int, a.box.split(",")); w, h = x1 - x0, y1 - y0
off = {"above": (0, -h - 4), "below": (0, h + 4), "left": (-w - 4, 0), "right": (w + 4, 0)}[a.src]
src = np.asarray(pl.crop((x0 + off[0], y0 + off[1], x1 + off[0], y1 + off[1])).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
ref = np.asarray(pl).astype(float)
# blend the edge that touches a surface (bottom for "above") toward the real colour beside the box
L = ref[y0:y1, max(x0 - 8, 0):x0].mean(1); R = ref[y0:y1, x1:x1 + 8].mean(1)
for i in range(h):
    t = max(0, (i - (h - 70)) / 70) if a.src == "above" else 0
    src[i] = src[i] * (1 - t * 0.85) + (L[i] * 0.5 + R[i] * 0.5) * (t * 0.85)
im = Image.fromarray(np.clip(src, 0, 255).astype(np.uint8))
f = a.feather; m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rectangle([f, f, w - f, h + 20], fill=255)
im.putalpha(m.filter(ImageFilter.GaussianBlur(f / 2)))
im.save(a.out)
prev = pl.copy(); prev.paste(im, (x0, y0), im)
prev.crop((max(x0 - 150, 0), max(y0 - 150, 0), min(x1 + 150, pl.width), min(y1 + 150, pl.height))).save("patch_preview.png")
print(f"patch {w}x{h} -> {a.out}; place at left:{x0}px top:{y0}px; check patch_preview.png")
