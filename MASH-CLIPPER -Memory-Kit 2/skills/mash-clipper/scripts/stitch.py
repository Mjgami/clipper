"""stitch.py <project> [clip-number]
Reads <project>/cuts.json and builds every clip (or one) from <project>/source.mp4:
  clips/<n> <name> - RAW 4K.mp4          vertical 9:16, steady crop centred on the speaker
  clips/<n> <name> - RAW Horizontal.mp4  original 16:9 framing (same cut, frame-for-frame)
  clips/previews/<n> <name> - preview.mp4 small phone-friendly copy
Segments are joined in the order listed; tiny 30 ms audio fades at each join only stop clicks.
"""
import json, os, re, subprocess, sys
import cv2, numpy as np

proj = sys.argv[1]
only = int(sys.argv[2]) if len(sys.argv) > 2 else None
SRC = os.path.join(proj, "source.mp4")
cuts = json.load(open(os.path.join(proj, "cuts.json")))
os.makedirs(os.path.join(proj, "clips", "previews"), exist_ok=True)
W, H = map(int, subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                "-of", "csv=p=0", SRC], capture_output=True, text=True).stdout.strip().split(","))
FADE = .03


DET = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")


def faces_at(cap, t):
    """faces at time t as (centre_x, under_face_bgr) in source px"""
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, f = cap.read()
    if not ok:
        return []
    g = cv2.cvtColor(cv2.resize(f, (W // 4, H // 4)), cv2.COLOR_BGR2GRAY)
    out = []
    for x, y, w, h in DET.detectMultiScale(g, 1.1, 5, minSize=(H // 40, H // 40)):
        X, Y, Wd, Hd = x * 4, y * 4, w * 4, h * 4
        body = f[min(H - 1, Y + Hd * 2):min(H, Y + Hd * 3), max(0, X):min(W, X + Wd)]
        out.append((X + Wd / 2, body.reshape(-1, 3).mean(0) if body.size else np.zeros(3), Wd))
    return out


def pick(faces, who):
    """who: None = biggest face; else a colour hint, e.g. 'light' (pale shirt) or 'dark' (dark jacket)"""
    if not faces:
        return None
    if who in ("light", "dark"):
        key = (lambda f: f[1].mean()) if who == "light" else (lambda f: -f[1].mean())
        return max(faces, key=key)[0]
    return max(faces, key=lambda f: f[2])[0]


def shot_cuts(a, b):
    """camera cuts inside [a, b] (source seconds)"""
    o = subprocess.run(["ffmpeg", "-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", SRC, "-vf", "scale=320:-2,select='gt(scene,0.25)',showinfo",
                        "-an", "-f", "null", "-"], capture_output=True, text=True).stderr
    return [a + float(x) for x in re.findall(r"pts_time:([0-9.]+)", o)]


def pieces(segments):
    """split every segment at camera cuts; each piece gets its own crop centre on the right person"""
    cap = cv2.VideoCapture(SRC)
    out = []
    for seg in segments:
        a, b = seg[0], seg[1]
        who = seg[3] if len(seg) > 3 else None
        bounds = [a] + [c for c in shot_cuts(a, b) if a + .2 < c < b - .2] + [b]
        for pa, pb in zip(bounds, bounds[1:]):
            xs = [x for t in np.linspace(pa + .05, pb - .05, 4) for x in [pick(faces_at(cap, t), who)] if x is not None]
            out.append((pa, pb, float(np.median(xs)) if xs else W / 2))
    return out


def build(n, clip):
    name, segs = clip["name"], clip["segments"]
    cw = int(round(H * 9 / 16 / 2)) * 2
    outH = 3840 if H >= 2160 else 1920
    parts = pieces(segs)
    crop = lambda cx: f"crop={cw}:{H}:{int(min(max(cx - cw / 2, 0), W - cw)) // 2 * 2}:0,scale={outH * 9 // 16}:{outH}:flags=lanczos,setsar=1"
    for mode, suffix in [("v", "RAW 4K"), ("h", "RAW Horizontal")]:
        ins, flt = [], []
        for i, (a, b, cx) in enumerate(parts):
            ins += ["-ss", f"{a:.3f}", "-t", f"{b - a:.3f}", "-i", SRC]
            flt.append(f"[{i}:v]{crop(cx) if mode == 'v' else 'setsar=1'}[v{i}]")
            flt.append(f"[{i}:a]afade=t=in:d={FADE},afade=t=out:st={b - a - FADE:.3f}:d={FADE}[a{i}]")
        k = len(parts)
        flt.append("".join(f"[v{i}][a{i}]" for i in range(k)) + f"concat=n={k}:v=1:a=1[v][a]")
        out = os.path.join(proj, "clips", f"{n} {name} - {suffix}.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(flt), "-map", "[v]", "-map", "[a]",
                        "-c:v", "libx264", "-crf", "16", "-preset", "slow", "-pix_fmt", "yuv420p", "-g", "30", "-keyint_min", "30",
                        "-sc_threshold", "0", "-x264-params", "open-gop=0", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart", out], check=True)
        if suffix == "RAW 4K":
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", out, "-vf", "scale=540:-2", "-c:v", "libx264", "-profile:v", "main",
                            "-crf", "26", "-preset", "veryfast", "-c:a", "aac", "-ar", "44100", "-b:a", "128k", "-movflags", "+faststart",
                            os.path.join(proj, "clips", "previews", f"{n} {name} - preview.mp4")], check=True)
    print(f"clip {n}: {name}  {sum(b - a for a, b, *_ in segs):.1f}s  ({len(parts)} shots, crop x {[round(p[2]) for p in parts]})", flush=True)


for n, clip in enumerate(cuts, 1):
    if only is None or only == n:
        build(n, clip)
