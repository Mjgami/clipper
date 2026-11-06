# 02 · Master workflow (link → clips → edit → 4K → cover)

Use the `mash-clipper` skill for steps 1-5 and the Mash Pro / HyperFrames skills for step 6+. Project folder: `~/Movies/MASH Clipper/<video title>/`.

```
<project>/
  source.mp4  source.json  words.json  lines.txt  captions_lines.txt
  cuts.json   cuts.before-trim.json
  clips/  "<n> <name> - RAW 4K.mp4"  "<n> <name> - RAW Horizontal.mp4"  previews/
  edit-<n>/ build/ (index.html, v.mp4, h.mp4, h1080.mp4, fonts, broll)  renders/  storyboard/
```

## Steps (every one is a gate where the user may redirect)
0. **Setup check** (`mash-clipper/scripts/setup.sh`). First run only.
1. **Source.** YouTube/online link, a file path, or a dragged file. Download the best quality, original audio untouched. Check who is who on screen (host vs guest) before clipping.
2. **Transcribe** word by word. Hindi/mixed: also pull the platform captions and re-transcribe the chosen stretches in the spoken language (see `03`).
3. **How many clips?** Offer 1-5 (recommend 3).
4. **Find story clips** (hook → body → payoff → ending). For interviews the clip must contain the question AND the answer (see `03`). Present them with hook line, topic, length and the payoff line.
5. **Cut raw clips** (vertical 9:16 4K framed on the speaker + the original horizontal version, always both). Verify every join by re-transcribing. Trim long pauses and stammers. Send previews; wait for approval.
6. **Style.** Clickable style picker page (15 styles + Personalize) built on the user's own frame; they click, copy the prompt, paste it back. Follow `05_STYLES_AND_PRESETS.md`.
7. **Build the edit** (HyperFrames + Mash Pro). Respect `04_EDITING_RULES.md` and `07_MISTAKES_NEVER_REPEAT.md`.
8. **PNG storyboard** (full screen, real frames). Wait for approval.
9. **720p phone preview** (`-q looks`, never draft). Phone-safe encode, and loud enough (see `09`). Wait for approval.
10. **4K final**: render with the 4K sources at `--resolution portrait-4k -q delivery`, mux the ORIGINAL audio untouched, Premiere-safe encode. Save to `~/Downloads/<video title> - Clips/NN <clip name> - <style> 4K.mp4`, reveal in Finder, send the 720p copy to the phone.
11. **Reel cover** (1080x1920 PNG) saved next to the 4K file.
12. Offer the next clip.

## Rules of thumb for the whole flow
- Both vertical and horizontal versions of every clip, always: the horizontal one is used whenever the speaker sits in a box/print/card, and for covers.
- Work from 4K sources in the final render; a 1080 proxy for snapshots/preview is fine.
- Keep `cuts.json` as the single source of truth. If a cut changes, rebuild the clip and re-time the edit from the source-based time map (see `06`), never by hand-adding offsets.
- A change request means: apply, re-check the affected frames, re-send only what changed.
