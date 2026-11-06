# 06 · Tech cookbook (commands, versions, patterns, bug → fix)

## Environment (what works on a Mac with no Homebrew)
- `ffmpeg`/`ffprobe` static build in PATH, Node 22+, `uv` for Python (`curl -LsSf https://astral.sh/uv/install.sh | sh`). Python 3.12 venv inside the skill: `uv venv --python 3.12 .venv`.
- Python packages: `yt-dlp faster-whisper "av>=14,<16" "opencv-python-headless<4.12" numpy pillow` (PyAV 19 breaks faster-whisper: `metadata_errors`; OpenCV 5 has no `CascadeClassifier`).
- `mash-clipper/scripts/setup.sh` checks all of this and prints `READY` or the one fix.
- yt-dlp needs a JS runtime for YouTube: add `--js-runtimes node`. Best format: `-f "bv*[vcodec^=avc1]+ba[ext=m4a]/bv*+ba/b" --merge-output-format mp4`. Download platform captions too (`--write-auto-subs --sub-langs "orig,.*-orig,hi,en"`). A 429 on English captions is normal; use the original-language ones.
- Whisper on Mac CPU: `WhisperModel("large-v3-turbo", device="cpu", compute_type="int8")` ≈ 25-35 min for 80 min of audio. `large-v3` is slower but fixes garbled mixed-language stretches.

## Cutting (`mash-clipper/scripts/stitch.py`)
- Per segment: `-ss a -t d -i source`, filter `crop=<9/16 of H>:H:x0:0,scale=2160:3840:flags=lanczos` for vertical, `setsar=1` for horizontal; 30 ms audio fades at joins; concat filter; `-c:v libx264 -crf 16 -preset slow -g 30 -keyint_min 30 -sc_threshold 0 -x264-params open-gop=0 -c:a aac -b:a 320k -movflags +faststart`.
- Camera cuts: `ffmpeg -vf "scale=320:-2,select='gt(scene,0.25)',showinfo"`. Faces: OpenCV Haar on a 1/4 frame; pick by clothing colour (`light`/`dark`) when two people share a shot.
- Pauses: `ffmpeg -af silencedetect=n=-32dB:d=0.3`. Cut keeping ~0.12 s each side. Rebuild the clip, then re-time the edit with the source-based time map below.

## Re-timing an edit after trims (important)
Never accumulate offsets. Build the map from the source segments:
```js
const MAP = [[oldClipTime, newClipTime, duration], ...];   // one row per kept segment
const T = (t) => { for (const [o,n,d] of MAP) { if (t < o) return n; if (t <= o+d) return +(n + t - o).toFixed(3); } return END; };
```
Wrap every time in the edit: scenes, captions, strips, rows, notes, literal times (`T(31.4)`). Set `data-duration` and `END` from the new clip length.

## HyperFrames (HTML → video) patterns
- Scaffold: `python3 ~/.claude/skills/motion-fx/scripts/new_project.py <dir> --aspect 9:16 --duration N --video clip.mp4` (copies gsap, motionkit, mashpro, fonts).
- Every `<video>`/`<audio>` with `data-start` needs an `id`, else it is FROZEN/SILENT in the render. Root: `data-composition-id="main" data-width data-height data-duration`.
- `npx hyperframes check <dir>` must show 0 errors (low-contrast notes on animated text are fine). `npx hyperframes snapshot <dir> -o out --at t1,t2 --no-end` for frames (`--keep` adds into an existing folder).
- Render: `npx hyperframes render <dir> -q looks --fps 30 -o out.mp4` for 720p previews (use `-q looks`, never `draft`); `--resolution portrait-4k -q delivery` for the final. For 4K swap the 1080 proxies for the 4K sources (`v.mp4`, `h.mp4`).
- Timeline is one paused GSAP timeline: `window.__timelines["main"] = tl`.
- Scene engine: `SCENES=[[a,b,kind]...]`; `SHOWS[kind]=[selectors]`; at t=0 `tl.set(ALL,{opacity:0},0)`; fade-in tween `fromTo(sel,{opacity:0,scale:1.035},{opacity:1,scale:1,duration:.4,immediateRender:false},a-.02)`; fade-out `to(sel,{opacity:0,scale:.985,duration:.3},b-.32)`; a `GATE` time so nothing reveals before its scene landed; captions start at `max(t0-.02, sceneStart+.15)`.
- Mash Pro text: `MP.text(el, t, "blur", {each:.04, dur:.5, sfx:false})` returns the end time; `el.__mp.words` are word spans (add class `key`). Highlights: absolutely-positioned bar behind the word (`.hlb`, `scaleX 0→1`, `immediateRender:false`), drawn ~0.55 s after the line starts.
- Baked waveform from real audio: FFT of 1024 samples per frame at 15 fps, 28 log-spaced bands, log1p, smoothed; animate each bar `scaleY` with a keyframes tween (no GSAP callbacks).
- Ken Burns on stills: `fromTo(img,{scale:1.16,xPercent:-2.2*dir},{scale:1.04,xPercent:2.2*dir,ease:"sine.inOut"})`.
- Name the right fonts in `@font-face` with local files (copy to `build/fonts`); the renderer cannot fetch unlisted fonts.

## Bug → fix table
| Symptom | Cause | Fix |
|---|---|---|
| Video frozen / voice silent in render | media element without `id` | add ids (lint `media_missing_id`) |
| Phone screen flashes white | `rotationX` 3D tilt on a layer with images | animate y/opacity only; images `decoding="sync"` |
| Text ghosts over the previous scene | caption starts before scene landed | gate captions to scene start +0.15 s |
| Two shots visible together at a switch | overlapping crossfade | sequential dip (out 0.3 s, then in 0.4 s) |
| Element visible at wrong time / blank hook | start state not set | `tl.set(el,{opacity:...},0)` + `immediateRender:false`; do not re-set the same element elsewhere |
| Captions look juggly | blur on running text / layout tweens | blur only on entry, transforms+opacity |
| Caption sliced on exit | mask exit | opacity+y fade exit |
| Text before she speaks | captions keyed early | `tIn = t0 - .02` |
| "Two layers fighting" zoom | zoom and box tween on same element | zoom on an inner layer |
| Cut-out words missing at a time | scene dip; not a bug | check the time map `T(t)` |
| Phone preview silent | player/muted or low level | AAC 44.1k stereo + loudnorm copy; tell user to unmute |
| 4K render plays badly in Premiere | long GOP | re-encode `-g 30 -keyint_min 30 -sc_threshold 0 open-gop=0` |
| Re-timed edit drifts ~0.5 s | stacked offset math | rebuild MAP from source segments |

## Finalize & previews (`mash-clipper/scripts/finalize.sh`)
- Preview: `ffmpeg -i in.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -profile:v main -level 4.0 -pix_fmt yuv420p -crf 21 -c:a aac -ar 44100 -ac 2 -b:a 160k -movflags +faststart out.mp4`.
- Loud phone copy: add `-af loudnorm=I=-14:TP=-1.5:LRA=11`.
- Final: `-map 0:v:0 -map 1:a:0 -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 16 -g 30 -keyint_min 30 -sc_threshold 0 -x264-params open-gop=0 -c:a copy -shortest` where input 1 is the clip's original audio.
- HDR iPhone footage must be tonemapped to SDR Rec.709 before delivery.

## Image generation (B-roll) in the browser
Higgsfield Seedream 4.5 with the role=switch "Unlimited" ON (check `aria-checked=true`, submit only when the button reads "Unlimited"); 9:16; ≤3 concurrent jobs. Fetch full-res URLs via `higgsfield generate list --image --json`; confirm `higgsfield account transactions` shows 0 credits. Never use paid models/CLI generation without a cost estimate and a yes.
