# 09 · Delivery and QA checklists

## Before showing a storyboard
- [ ] Real frames from the live build, full-screen PNG, named by order + time.
- [ ] Every beat checked: face clear (3 points), safe zone, no overlaps, nothing early, captions = exact words, no repeats.
- [ ] Highlights/animations visible mid-motion (snapshot 0.1-0.3 s into an entrance).
- [ ] `hyperframes check` = 0 errors (media ids!).

## Before a 720p preview
- [ ] Every transition snapshotted at start / middle / end: no double exposure, no flash, no empty frame.
- [ ] Cuts: re-transcribed; no stammers/stray syllables/long gaps; clip starts on the first word and ends on a complete sentence.
- [ ] Render `-q looks`; make the phone-safe copy (H.264 Main 4.0, AAC 44.1k stereo, faststart); also a loudnorm copy if they cannot hear it.
- [ ] Send the file (≤30 MB in chat) and say what was and was not verified.

## Before a 4K final
- [ ] 720p approved.
- [ ] Sources swapped to the 4K files; render `--resolution portrait-4k -q delivery --fps 30`.
- [ ] Mux the clip's original audio untouched; closed GOP; check duration of audio = video.
- [ ] Spot-check 5-7 frames of the final and the file's codec/size.
- [ ] Save to `~/Downloads/<video title> - Clips/NN <clip name> - <style> 4K.mp4`; `open -R` it; send the phone copy.

## Cover (1080x1920 PNG)
- Interview/conversation: two equal taped prints, host left and guest right facing each other, same face size and height, names as red-pen tags, headline below (short, with a marker highlight). Faces and headline stay inside the central 3:4 area (Instagram grid crop).
- Single speaker: one large taped print + headline + name.
- Pick clear frames (eyes open, mouth natural, front-facing). Replace weak stills from the full source video.
- Save next to the 4K file; send the PNG.

## Folder & naming
`~/Movies/MASH Clipper/<video title>/` for work; finals in `~/Downloads/<video title> - Clips/`. Keep only the latest final, never `_raw`. Numbered, human names ("01 Toxic Shame Starts At Home - Documentary 4K.mp4").

## Final message template (keep it short)
What is done · where the file is (exact path) · what was verified · what was NOT verified · the one question that unblocks the next step.
