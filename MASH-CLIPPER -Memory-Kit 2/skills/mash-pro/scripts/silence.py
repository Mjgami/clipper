"""Cut every silent gap out of a talking clip (jump-cut raw edit).

  python3 silence.py clip.mp4 [--db -35] [--min 0.35] [--pad 0.08] [--out cut.mp4] [--xml cut.xml]

Writes keep.json ([[start, end], ...] in seconds) next to --out, renders the tight cut (x264, keyint 30, Premiere-friendly)
and, with --xml, a Premiere/Resolve timeline (FCP7 XML) that references the ORIGINAL file, so every cut can be
opened back up in the editor. Only gaps are removed: picking takes stays a human/Claude decision.
"""
import argparse, json, os, re, subprocess, sys, urllib.parse
from xml.sax.saxutils import escape

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "motion-fx", "scripts"))
from ff import ffmpeg  # noqa: E402


def probe(src):
    err = subprocess.run([ffmpeg(), "-hide_banner", "-i", src], capture_output=True, text=True, errors="replace").stderr
    dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", err)
    v = re.search(r"Video:.*?, (\d{2,5})x(\d{2,5})[ ,].*?([\d.]+) fps", err)
    a = re.search(r"Audio:.*?(\d+) Hz, (mono|stereo|[\d.]+)", err)
    return {"dur": int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3]),
            "w": int(v[1]) if v else 1920, "h": int(v[2]) if v else 1080, "fps": float(v[3]) if v else 30.0,
            "sr": int(a[1]) if a else 48000, "ch": 1 if a and a[2] == "mono" else 2}


def silences(src, db, mn):
    err = subprocess.run([ffmpeg(), "-hide_banner", "-i", src, "-af", f"silencedetect=noise={db}dB:d={mn}", "-vn", "-f", "null", "-"],
                         capture_output=True, text=True, errors="replace").stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
    return list(zip(st, en + [None] * (len(st) - len(en))))


def keep_ranges(sil, dur, pad):
    keep, t = [], 0.0
    for s, e in sil:
        e = dur if e is None else e
        if s - t > 0.05:
            keep.append([max(0, t - pad if t else 0), min(dur, s + pad)])
        t = e
    if dur - t > 0.05:
        keep.append([max(0, t - pad), dur])
    merged = []
    for a, b in keep:
        if merged and a <= merged[-1][1]:
            merged[-1][1] = b
        else:
            merged.append([round(a, 3), round(b, 3)])
    return merged


def render(src, keep, out):
    parts = "".join(f"[0:v]trim={a}:{b},setpts=PTS-STARTPTS[v{i}];[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS[a{i}];" for i, (a, b) in enumerate(keep))
    fc = parts + "".join(f"[v{i}][a{i}]" for i in range(len(keep))) + f"concat=n={len(keep)}:v=1:a=1[v][a]"
    fcf = out + ".filter.txt"; open(fcf, "w").write(fc)
    subprocess.run([ffmpeg(), "-v", "error", "-y", "-i", src, "-filter_complex_script", fcf, "-map", "[v]", "-map", "[a]",
                    "-c:v", "libx264", "-crf", "17", "-preset", "medium", "-g", "30", "-keyint_min", "30", "-sc_threshold", "0",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", out], check=True)
    os.remove(fcf)


def xml(src, keep, info, out, name):
    fps = round(info["fps"]); total = round(info["dur"] * fps)
    url = "file://localhost" + urllib.parse.quote(os.path.abspath(src).replace("\\", "/"))
    rate = f"<rate><timebase>{fps}</timebase><ntsc>FALSE</ntsc></rate>"
    fb = (f'<file id="file-1"><name>{escape(os.path.basename(src))}</name><pathurl>{url}</pathurl>{rate}<duration>{total}</duration>'
          f'<media><video><samplecharacteristics>{rate}<width>{info["w"]}</width><height>{info["h"]}</height></samplecharacteristics></video>'
          f'<audio><samplecharacteristics><depth>16</depth><samplerate>{info["sr"]}</samplerate></samplecharacteristics><channelcount>{info["ch"]}</channelcount></audio></media></file>')
    V, A, t = [], [[] for _ in range(info["ch"])], 0
    for i, (a, b) in enumerate(keep, 1):
        fi, fo = round(a * fps), round(b * fps)
        if fo <= fi:
            continue
        st, en = t, t + fo - fi
        ids = [(f"v-{i}", "video", 1)] + [(f"a{c}-{i}", "audio", c) for c in range(1, info["ch"] + 1)]
        links = "".join(f"<link><linkclipref>{cid}</linkclipref><mediatype>{mt}</mediatype><trackindex>{ti}</trackindex><clipindex>{i}</clipindex></link>" for cid, mt, ti in ids)
        common = f"<enabled>TRUE</enabled><duration>{total}</duration>{rate}<start>{st}</start><end>{en}</end><in>{fi}</in><out>{fo}</out>"
        V.append(f'<clipitem id="v-{i}"><name>{escape(os.path.basename(src))}</name>{common}{fb if i == 1 else chr(60) + "file id=" + chr(34) + "file-1" + chr(34) + "/>"}{links}</clipitem>')
        for c in range(1, info["ch"] + 1):
            A[c - 1].append(f'<clipitem id="a{c}-{i}"><name>{escape(os.path.basename(src))}</name>{common}<file id="file-1"/>'
                            f"<sourcetrack><mediatype>audio</mediatype><trackindex>{c}</trackindex></sourcetrack>{links}</clipitem>")
        t = en
    tracks_a = "".join(f"<track>{''.join(a)}</track>" for a in A)
    doc = (f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE xmeml>\n<xmeml version="4"><sequence id="sequence-1"><name>{escape(name)}</name><duration>{t}</duration>{rate}'
           f'<media><video><format><samplecharacteristics>{rate}<width>{info["w"]}</width><height>{info["h"]}</height><pixelaspectratio>square</pixelaspectratio></samplecharacteristics></format>'
           f"<track>{''.join(V)}</track></video><audio>{tracks_a}</audio></media></sequence></xmeml>\n")
    open(out, "w", encoding="utf-8").write(doc)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--db", type=float, default=-35)
    ap.add_argument("--min", type=float, default=0.35, help="shortest gap to cut (s)")
    ap.add_argument("--pad", type=float, default=0.08, help="breath kept on each side of speech (s)")
    ap.add_argument("--out", default=None)
    ap.add_argument("--xml", default=None)
    ap.add_argument("--no-render", action="store_true")
    a = ap.parse_args()
    info = probe(a.src)
    keep = keep_ranges(silences(a.src, a.db, a.min), info["dur"], a.pad)
    out = a.out or os.path.splitext(a.src)[0] + "_cut.mp4"
    kj = os.path.splitext(out)[0] + ".keep.json"; json.dump(keep, open(kj, "w"))
    kept = sum(b - a_ for a_, b in keep)
    print(f"{len(keep)} pieces, {info['dur']:.1f}s -> {kept:.1f}s ({info['dur'] - kept:.1f}s of gaps cut) -> {kj}")
    if a.xml:
        xml(a.src, keep, info, a.xml, os.path.splitext(os.path.basename(out))[0]); print("timeline ->", a.xml)
    if not a.no_render:
        render(a.src, keep, out); print("video ->", out)


if __name__ == "__main__":
    main()
