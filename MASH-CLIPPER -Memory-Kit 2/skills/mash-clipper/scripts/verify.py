"""verify.py <project> - re-transcribes every finished clip so you can check each join:
no clipped first/last word, no stray syllable, story reads in order. Prints the text per clip."""
import glob, os, sys
from faster_whisper import WhisperModel

proj = sys.argv[1]
m = WhisperModel("base", device="cpu", compute_type="int8")
for f in sorted(glob.glob(os.path.join(proj, "clips", "previews", "*.mp4"))):
    segs, _ = m.transcribe(f)
    print("==", os.path.basename(f))
    print(" ".join(s.text.strip() for s in segs), "\n", flush=True)
