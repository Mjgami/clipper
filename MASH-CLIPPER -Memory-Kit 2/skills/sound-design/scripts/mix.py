#!/usr/bin/env python3
"""Final mix: clean voice + soft music + SFX, broadcast loudness.

  python3 mix.py --voice voice.wav|clip.mp4 --sfx sfx.wav --music music_raw.wav --dur 19.2 --out mix.wav
                 [--voice-lufs -14] [--music-under 24] [--no-voice] [--clean]

Levels (house rules):
  voice   loudest, normalised to --voice-lufs (default -14 LUFS, -1.5 dBTP)
  music   --music-under dB below the voice (default 24 dB), then sidechain-ducked under speech
          with no voice (pure motion pieces) music sits at -20 LUFS
  sfx     untouched (sfx_music.py already peaks them at -17 dBFS)
--clean runs the voice clean-up chain first (high-pass, de-noise, de-ess, gentle compression).
Prints the loudness of every stem and the final mix.
"""
import argparse, json, os, re, subprocess, sys, tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402

FF = ffmpeg()


def run(args):
    return subprocess.run([FF, "-hide_banner", *args], capture_output=True, text=True, encoding="utf-8", errors="replace").stderr


def loudnorm(src, dst, I, TP):
    o = run(["-i", src, "-af", f"loudnorm=I={I}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"])
    d = json.loads(o[o.rindex("{"):o.rindex("}") + 1])
    af = (f"loudnorm=I={I}:TP={TP}:LRA=11:measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:"
          f"measured_thresh={d['input_thresh']}:offset={d['target_offset']}:linear=true")
    run(["-loglevel", "error", "-y", "-i", src, "-af", af, "-ar", "48000", "-ac", "1", dst])


def stats(f):
    o = run(["-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"]); s = o[o.rindex("Summary"):]
    return float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1)), float(re.search(r"Peak:\s+(-?[\d.]+)", s).group(1))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice"); ap.add_argument("--sfx"); ap.add_argument("--music"); ap.add_argument("--dur", type=float, required=True)
    ap.add_argument("--out", default="mix.wav"); ap.add_argument("--voice-lufs", type=float, default=-14); ap.add_argument("--music-under", type=float, default=24)
    ap.add_argument("--clean", action="store_true"); ap.add_argument("--start", type=float, default=0.0, help="voice source offset (s)")
    a = ap.parse_args()
    tmp = tempfile.mkdtemp(); ins = []; graph = []
    fade = f"afade=t=out:st={max(a.dur - 0.25, 0)}:d=0.25"
    if a.voice:
        chain = "highpass=f=80,afftdn=nf=-28,deesser=i=0.3,acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2," if a.clean else ""
        run(["-loglevel", "error", "-y", "-ss", str(a.start), "-i", a.voice, "-t", str(a.dur), "-vn", "-ac", "1", "-ar", "48000",
             "-af", f"{chain}apad=whole_dur={a.dur},atrim=0:{a.dur},{fade}", f"{tmp}/v0.wav"])
        loudnorm(f"{tmp}/v0.wav", f"{tmp}/voice.wav", a.voice_lufs, -1.5); ins.append(f"{tmp}/voice.wav")
    if a.music:
        target = a.voice_lufs - a.music_under if a.voice else -20
        loudnorm(a.music, f"{tmp}/music.wav", target, -9); ins.append(f"{tmp}/music.wav")
    if a.sfx:
        ins.append(a.sfx)
    args = ["-loglevel", "error", "-y"]
    for f in ins: args += ["-i", f]
    labels = []
    if a.voice and a.music:
        graph.append("[0:a]asplit=2[v][vsc]"); graph.append("[1:a][vsc]sidechaincompress=threshold=0.03:ratio=3:attack=40:release=400[m]"); labels = ["[v]", "[m]"]
        if a.sfx: labels.append("[2:a]")
    else:
        labels = [f"[{i}:a]" for i in range(len(ins))]
    graph.append("".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,atrim=0:{a.dur},alimiter=limit=0.89:level=false[out]")
    run(args + ["-filter_complex", ";".join(graph), "-map", "[out]", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", a.out])
    for name, f in [("voice", f"{tmp}/voice.wav"), ("music", f"{tmp}/music.wav"), ("sfx", a.sfx), ("MIX", a.out)]:
        if f and os.path.exists(f):
            I, P = stats(f); print(f"{name:6s} {I:6.1f} LUFS  peak {P:6.1f} dBFS")


if __name__ == "__main__":
    main()
