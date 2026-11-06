---
name: mash-pro-editor
description: START HERE. Mash Pro Editor is the one command for the whole editing kit - give it a raw clip, a script or just an idea and it delivers a finished, professionally edited video using a ready-made Mash Pro preset (Reel Hook, YouTube Explainer, SaaS Launch, Apple Glass, Vox Map, Data Story, Beat Edit, Podcast Clip, Real Estate, Construction, Creator, Bold Impact). Checks the computer is set up, asks only what it needs, storyboards, builds with HyperFrames + Mash Pro, adds frame-synced sound and runs QA. Use for "edit this video", "make a reel/short/YouTube video/ad/promo", "motion graphics", "use Mash Pro", or any video request.
---

# Mash Pro Editor

The user types one prompt. You run the whole edit and only ask what you truly need.
This skill is the front door: it picks a **Mash Pro preset** (below), then runs the pipeline of `/edit-director`
with `/mash-pro` effects loaded in every project. Presets give motion, pacing and sound only; colours and fonts
always come from the brand or `/motion-theme`.

## 0. First run on a new computer (do once, quietly)
Check `node --version` (22+), `ffmpeg -version` (or `python3 motion-fx/scripts/ff.py`), `python3 -c "import numpy, PIL"`.
If something is missing, tell the user the ONE command to fix it (see the kit's START HERE.txt), wait, re-check.
Optional full check: `python3 <kit>/selftest.py` renders a 3 s test video with sound and QA.

## 1. Intake (one message, skip anything already known)
1. **Whose video?** Own channel, or a client/brand. Client → load their brand kit first
   (`~/.claude/motion-kit/brands/<client>/brand.json`, a brand-kit skill, or their files). No kit → ask, then save one.
2. **Input**: clip path/link, voiceover, script, or just an idea (no footage → SaaS Launch / Apple Glass / Data Story).
3. **Preset**: show the 12 presets as a short list with ONE recommendation for this clip.
4. **Format**: 9:16, 16:9, 1:1 / 4:5, or several (`/mash-pro` resize.py makes extra formats from one edit). 1080p or 4K.
5. **Language** spoken, and language of on-screen words. Captions, or key words only?
6. **Audio**: voice only, or SFX + soft music. **Length**: whole clip or a range.
If the user says "just do it / don't wait", decide everything yourself and skip the storyboard approval.

## 2. The 12 Mash Pro presets
Full recipes (exact calls, timings, sound) are in `presets.json` next to this file. Read the chosen one before building.

| # | Preset | For | Base skill + look | Signature Mash Pro moves |
|---|---|---|---|---|
| 1 | **Mash Reel Hook** | talking head, 9:16 | vertical-edit, Bold/Clean | `title` hook at the bottom + `lens` shake, `impact` on key words, kinetic captions, `endCard` |
| 2 | **Mash YouTube Explainer** | talking head, 16:9 | horizontal-edit, Creator Explainer | `lowerThird`, `callout` on things on screen, `steps` for lists, smooth zooms, `whip` between sections |
| 3 | **Mash SaaS Launch** | product / app, no face | saas-motion | `screen rise3d`, `cursor` clicks, UI `zoom`, `carousel`, `count`, `bgSwitch` every 1-2 lines |
| 4 | **Mash Apple Glass** | premium product film | saas-motion, Clean Glass | `orbit`, `screen unfold`, `fan`, `aurora` bg, `tracking` + `blur` type, `blur` transitions, few sounds |
| 5 | **Mash Vox Map** | explainers about places, history, trade | horizontal-edit, Vox Explainer | `map` flyTo / highlight / pin / route, `line` chart, `quote`, `push` transitions |
| 6 | **Mash Data Story** | finance, results, case studies | vertical or horizontal, Finance | `count`, `bars`, `ring`, `line`, `steps`, `glitch` transition (once) |
| 7 | **Mash Beat Edit** | music-driven montage, b-roll, events | vertical-edit | `beats.py`, `beatShake` on downbeats, `beatFlash`, word `pop` per beat, `whip` on drops |
| 8 | **Mash Podcast Clip** | two people, long talk | vertical-edit, Podcast Clip | `silence.py` tight cut, `resize.py` 9:16 on the speaker, captions, one `impact` on the best line |
| 9 | **Mash Real Estate** | homes, walkthroughs, agents | vertical-edit, Agent Story / Luxury | `lowerThird` agent, `callout` on features, `map` pin for location, warm `lightLeak`, `blur` transitions |
| 10 | **Mash Construction** | sites, trades, before/after | vertical-edit, Project Progress | `steps` for the process, `bars` progress, `bounce` shakes on heavy hits, `whip` before/after |
| 11 | **Mash Creator** | creator YouTube, screen + face | horizontal-edit + CreatorFX | CreatorFX PiP / screen showcase + Mash `title`, `lowerThird`, `callout`, `quote`, `endCard` |
| 12 | **Mash Bold Impact** | hype, motivation, ads | vertical-edit, Bold Impact | `scramble` / `stretch` titles, `squeeze` + `glitch` shakes, `whiteFlicker` on punchlines |

Recommendation guide: face to camera → 1 (vertical) or 2 (horizontal); app/website → 3; premium product → 4;
places/countries → 5; numbers → 6; music only → 7; two mics → 8; house → 9; machinery/site → 10;
screen recording + face → 11; hype/ad → 12. Any preset can borrow any Mash Pro effect.

## 3. Pipeline
1. **Prep**: copy the source into a project folder (never touch the original). Cut the range.
2. **Raw cut** when there are retakes or pauses: last take of each line wins, drop repeats and false starts, keep
   real ad-libs. `mash-pro/scripts/silence.py clip.mp4 --xml cut.xml` closes every gap and gives a Premiere/Resolve
   timeline that still points at the original file.
3. **Words** (`motion-fx/scripts/words.py --refine`) + **frame map**: where the face is and where the empty space is.
4. **Theme** (`/motion-theme`; `mash-pro/scripts/palette.py` pulls colours from the footage).
5. **Storyboard** (time | words | on screen | Mash Pro call | sound) as a themed page → wait for OK unless told not to.
6. **Build**: `motion-fx/scripts/new_project.py` (MotionKit, CreatorFX and Mash Pro are already loaded), write the preset's
   calls on the word timestamps, `npx hyperframes check` (0 errors), snapshot every beat and LOOK at it, fix, render.
7. **Sound**: save `MP.cuesJSON()` (merged with any MotionKit cues) as `cues.json` → `/sound-design`
   (SFX -17 dB on the exact frame, music very soft under the voice). Voice-only edits: just normalise the voice.
8. `motion-fx/scripts/finalize.py` (Premiere-safe encode) → `/edit-qa` → deliver the MP4 + a short beat summary.
   Extra formats: `mash-pro/scripts/resize.py`.

## Rules
- Kinetic typography only (never boxed karaoke captions). Text in the safe zone, never on the face or mouth.
- Every visual matches the exact words at that moment. Prefer real UI and the user's own screenshots.
- Smooth zooms on impact lines; no hard punch-in jump cuts unless asked. Max one heavy shake every 3-4 seconds.
- Human typography: real word gaps, no wide-tracked labels, even spacing.
- Client work uses only that client's brand kit. One video = one brand. Never invent facts or numbers.
- Free fonts and code-made or user-owned audio only. Never spend paid credits without asking.
- Keep edits lean: no effect without a reason in the words.
