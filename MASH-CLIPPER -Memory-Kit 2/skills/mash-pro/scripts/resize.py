"""Reformat a video to another aspect ratio (comp resizer).

  python3 resize.py clip.mp4 --to 9:16 [--mode crop|fit] [--focus 0.5] [--height 1920] [--out clip_9x16.mp4]

crop: fills the new frame, keeping the horizontal point --focus (0 = left edge, 0.5 = centre, 1 = right) in view.
      Put focus on the speaker so the face stays inside the reel safe zone.
fit:  whole original frame, centred, over a blurred and darkened copy of itself (no black bars).
Output is x264 with a 1 s keyframe interval (plays smoothly in Premiere).
"""
import argparse, os, subprocess, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

DEFAULT_H = {"9:16": 1920, "16:9": 1080, "1:1": 1080, "4:5": 1350}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--to", required=True, help="9:16, 16:9, 1:1, 4:5 or W:H")
    ap.add_argument("--mode", choices=["crop", "fit"], default="crop")
    ap.add_argument("--focus", type=float, default=0.5)
    ap.add_argument("--height", type=int, default=None)
    ap.add_argument("--out", default=None)
    a = ap.parse_args()
    rw, rh = (int(v) for v in a.to.split(":"))
    H = a.height or DEFAULT_H.get(a.to, 1080)
    W = int(round(H * rw / rh / 2)) * 2
    f = min(1, max(0, a.focus))
    if a.mode == "crop":
        vf = (f"scale=w='if(gt(iw/ih,{W}/{H}),-2,{W})':h='if(gt(iw/ih,{W}/{H}),{H},-2)',"
              f"crop={W}:{H}:x='(iw-{W})*{f}':y='(ih-{H})/2',setsar=1")
        cmd = ["-vf", vf]
    else:
        fc = (f"[0:v]split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40,eq=brightness=-0.12[bg];"
              f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]")
        cmd = ["-filter_complex", fc, "-map", "[v]", "-map", "0:a?"]
    out = a.out or f"{os.path.splitext(a.src)[0]}_{rw}x{rh}.mp4"
    subprocess.run([ffmpeg(), "-v", "error", "-y", "-i", a.src, *cmd, "-c:v", "libx264", "-crf", "17", "-preset", "medium",
                    "-g", "30", "-keyint_min", "30", "-sc_threshold", "0", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k",
                    "-movflags", "+faststart", out], check=True)
    print(f"{a.to} {a.mode} {W}x{H} -> {out}")


if __name__ == "__main__":
    main()
