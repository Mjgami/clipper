"""transcribe.py <video> -> words.json ([word, start, end]) + lines.txt (sentences with timestamps), next to the video.

Uses faster-whisper large-v3-turbo on the CPU (works on any Mac/PC, ~3-6x faster than large-v3).
Pass --model large-v3 for the most accurate result on hard audio.
"""
import argparse, json, os, subprocess, tempfile
from faster_whisper import WhisperModel

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--model", default="large-v3-turbo")
ap.add_argument("--lang", default=None)
a = ap.parse_args()
out = os.path.dirname(os.path.abspath(a.video))
wav = os.path.join(tempfile.mkdtemp(), "a.wav")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-vn", "-ac", "1", "-ar", "16000", wav], check=True)
model = WhisperModel(a.model, device="cpu", compute_type="int8")
segs, info = model.transcribe(wav, word_timestamps=True, language=a.lang, vad_filter=True)
words = []
for s in segs:
    for w in s.words:
        words.append([w.word.strip(), round(w.start, 2), round(w.end, 2)])
json.dump(words, open(os.path.join(out, "words.json"), "w"))
lines, cur = [], []
for w in words:
    cur.append(w)
    if w[0].endswith((".", "?", "!")) or len(cur) >= 28:
        lines.append(f"{cur[0][1]:8.2f}-{cur[-1][2]:8.2f}  " + " ".join(x[0] for x in cur)); cur = []
if cur:
    lines.append(f"{cur[0][1]:8.2f}-{cur[-1][2]:8.2f}  " + " ".join(x[0] for x in cur))
open(os.path.join(out, "lines.txt"), "w").write("\n".join(lines))
print(f"{len(words)} words, {len(lines)} lines, language {info.language} -> words.json, lines.txt")
