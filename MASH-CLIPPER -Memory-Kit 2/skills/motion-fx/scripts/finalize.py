#!/usr/bin/env python3
"""Mux the silent HyperFrames render with the audio mix and encode a delivery file.

  python3 finalize.py --video render_silent.mp4 --audio mix.wav --out Final.mp4 [--target social|youtube|master]

social : H.264 high, CRF 17, 30 fps, AAC 320k (Reels / TikTok / Shorts)
youtube: H.264 high, CRF 18 capped at 14 Mbps (grain-heavy edits stay small), AAC 320k (1080p)
youtube4k: H.264 high, CRF 15, level 5.2, for 3840x2160 renders (render with --resolution landscape-4k)
master : ProRes 422 HQ + PCM, for Premiere / After Effects

Every H.264 target uses a keyframe every 30 frames, closed GOP and BT.709 tags. Raw HyperFrames renders have
keyframes ~5 s apart and can look "damaged" or refuse to play in Premiere Pro; never hand over the raw render.
"""
import argparse, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ff import ffmpeg  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument("--video", required=True); ap.add_argument("--audio"); ap.add_argument("--out", required=True)
ap.add_argument("--target", default="social")
a = ap.parse_args()
GOP = ["-g", "30", "-keyint_min", "30", "-sc_threshold", "0", "-bf", "2", "-x264-params", "open-gop=0",
       "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]
V = {
    "social": ["-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart"],
    "youtube": ["-c:v", "libx264", "-crf", "18", "-maxrate", "14M", "-bufsize", "28M", "-preset", "slow", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k", "-movflags", "+faststart"],
    "youtube4k": ["-c:v", "libx264", "-crf", "15", "-preset", "slow", "-profile:v", "high", "-level:v", "5.2", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart"],
    "master": ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le", "-c:a", "pcm_s16le"],
}[a.target]
if a.target != "master":
    V = V[:2] + GOP + V[2:]
cmd = [ffmpeg(), "-hide_banner", "-loglevel", "error", "-y", "-i", a.video]
if a.audio:
    cmd += ["-i", a.audio, "-map", "0:v", "-map", "1:a", "-shortest"]
subprocess.run(cmd + V + [a.out], check=True)
info = subprocess.run([ffmpeg(), "-hide_banner", "-i", a.out], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr
print([l.strip() for l in info.splitlines() if "Duration" in l or "Video:" in l])
print(f"{os.path.getsize(a.out) / 1e6:.1f} MB -> {a.out}")
