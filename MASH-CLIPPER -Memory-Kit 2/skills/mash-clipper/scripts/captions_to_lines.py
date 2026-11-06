"""captions_to_lines.py <project> - turns the platform captions (<project>/captions.*.vtt) into
<project>/captions_lines.txt: clean ~12 s paragraphs with start times, rolling-caption duplicates removed.
Use it to READ the video when the speech is not English or mixes languages (Whisper translates / loops there),
and keep words.json / a re-transcription in the spoken language for word-accurate cut points."""
import glob, html, os, re, sys

proj = sys.argv[1]
files = sorted(glob.glob(os.path.join(proj, "captions.*.vtt")), key=lambda f: ("orig" not in f, f))
if not files:
    sys.exit("no platform captions found")
s = open(files[0], encoding="utf-8").read()
out, last = [], ""
for h, m, sec, ms, txt in re.findall(r"(\d+):(\d+):(\d+)\.(\d+) --> [^\n]*\n(.*?)(?:\n\n|\Z)", s, re.S):
    t = int(h) * 3600 + int(m) * 60 + int(sec) + int(ms) / 1000
    for ln in html.unescape(re.sub(r"<[^>]+>", "", txt)).split("\n"):
        ln = ln.strip()
        if ln and ln != last and not last.endswith(ln):
            out.append((t, ln)); last = ln
paras, cur, st = [], [], None
for t, ln in out:
    st = t if st is None else st
    cur.append(ln)
    if t - st > 12:
        paras.append(f"{st:7.0f}s  " + " ".join(cur)); cur, st = [], None
if cur:
    paras.append(f"{st:7.0f}s  " + " ".join(cur))
open(os.path.join(proj, "captions_lines.txt"), "w", encoding="utf-8").write("\n".join(paras))
print(f"{os.path.basename(files[0])} -> captions_lines.txt ({len(paras)} paragraphs)")
