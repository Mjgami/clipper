---
name: mash-clipper
description: MASH Clipper turns any long video (YouTube link, a file in a folder, or an upload) into 1-5 story-shaped vertical clips (hook, body, payoff, CTA) and then edits the chosen clips in one of 15 trending styles (or a personalised one) with the Mash Pro kit, step by step with approvals - raw cuts, style board on the user's own frames, PNG storyboard, 720p preview, 4K final. Use for "MASH Clipper", "MESH Clipper" (dictation), "clip this video", "make shorts/reels from this YouTube video", "find the best clips", or any long video the user wants turned into edited short clips.
---

# MASH Clipper

> **First:** load `/mash-playbook` (the user's complete working memory) and follow it. For interviews/podcasts every clip = question + answer.

One long video in, finished short clips out. Run the steps **in order** and **stop at every approval gate**
(marked ⛔). Never skip a gate, never render before the user says yes. Ask with the AskUserQuestion tool
whenever a step offers options. Talk to the user in plain words, no jargon.

Scripts live in `scripts/` next to this file (`SKILL_DIR`). Work in a new project folder:
`~/Movies/MASH Clipper/<video title>/` (create it), never inside the skill folder.

## Step 0 · Setup check (first run only, quietly)
Run `bash "$SKILL_DIR/scripts/setup.sh"`. It checks ffmpeg, Node 22+, and builds the private Python tools
(yt-dlp, faster-whisper, opencv) with `uv`. If something is missing it prints the ONE fix; tell the user that
fix in a single sentence, wait, run it again. Do not continue until it prints `READY`.

## Step 1 · Where is the video? ⛔
Ask (AskUserQuestion, single choice):
1. **YouTube video** - they paste a link.
2. **A file in a folder** - they paste the path (Finder: right-click the file, hold Option, "Copy as Pathname").
3. **Upload from my computer** - they drag the file into the chat; use the path it lands at.

Then: `"$SKILL_DIR/scripts/fetch.sh" "<link-or-path>" "<project>"` → `<project>/source.mp4` (highest quality,
the original audio untouched). Tell them the title and length.

## Step 2 · Transcribe
`"$SKILL_DIR/.venv/bin/python" "$SKILL_DIR/scripts/transcribe.py" "<project>/source.mp4"` →
`words.json` (every word with its time) + `lines.txt` (one sentence per line with timestamps). Read `lines.txt` fully.
Note any part that is not the main speaker (intros, someone else talking, music) and leave it out.

**Non-English or mixed-language speech (Hindi/Hinglish, Spanish, …):** Whisper's auto mode may translate or loop.
Then (a) read the video from the platform captions: `.venv/bin/python scripts/captions_to_lines.py "<project>"`
→ `captions_lines.txt` (fetch.sh saves them for links); for local files re-run transcribe.py with `--lang <code>`;
(b) for the chosen stretches, re-transcribe in the spoken language for word timings; (c) when verifying, check
each join against BOTH transcripts (Whisper skips short English phrases inside Hindi and vice versa - a missing
phrase in one transcript is not a bad cut if the other has it). Captions later are in the language actually spoken.

## Step 3 · How many clips? ⛔
Ask: "How many clips do you want from this video?" options **1, 2, 3, 4, 5** (recommend 3).

## Step 4 · Find the clips (the core skill)
Follow `references/clip-framework.md` exactly. Each clip is a **complete mini-story** built from the strongest
lines anywhere in the video (segments may come from different parts and are stitched in story order):
**Hook (0-3 s) → Body (the why / example) → Payoff (the realisation) → CTA or punchline ending.**
Never a random window. Write `<project>/cuts.json` (schema in the framework file) with word-accurate times.
Score each candidate (hook strength, completeness, payoff, standalone sense) and keep the top N.

## Step 5 · Cut and check the raw clips ⛔
`"$SKILL_DIR/.venv/bin/python" "$SKILL_DIR/scripts/stitch.py" "<project>"` makes, per clip:
- `clips/<n> <name> - RAW 4K.mp4` vertical 9:16, steady crop centred on the speaker's face (no jumpy tracking),
- `clips/<n> <name> - RAW Horizontal.mp4` the original 16:9 framing (**always made** - used later whenever
  the speaker sits inside a box or shape),
- `clips/previews/<n> <name> - preview.mp4` small phone-friendly copy.
Then `.venv/bin/python scripts/verify.py "<project>"` re-transcribes every clip; read it and fix any clipped
word or stray syllable (move the cut point by the word timings) and re-run stitch for that clip.
Show the user each clip: its hook line, what it's about, length, and send the previews (SendUserFile when
available). Ask them to approve, or say what to change. Loop until approved. Recommend which clip to edit first.

## Step 6 · Pick the editing style ⛔ (clickable picker)
1. Run `"$SKILL_DIR/.venv/bin/python" "$SKILL_DIR/scripts/style_board.py" "<project>" <clip-number>`. It grabs
   a real frame + the clip's hook words, finds the face, and renders **all 15 styles on the user's own frame**
   (captions always under the chin) → `style-board/NN <style>.png`, `style-board.png`, and
   **`style-picker.html`** - a clickable page: 15 style cards + 16. Personalize (a small form for colours,
   fonts, caption look, amount of graphics, reference link).
2. Open it for them (`open "<project>/style-picker.html"` on Mac, `start` on Windows; or send the file) and say:
   "Click the style you like, press **Copy prompt**, and paste it here." The pasted prompt names the clip, the
   style number + name and its recipe - use exactly that.
3. If they can't open it, fall back to AskUserQuestion with the list in `references/styles.md` (+ send `style-board.png`).
4. Personalize prompts carry their answers; ask only for what's still missing (a brand-kit file or logo, if any).
5. **Trend check (when web search is available):** search for how that style is being edited in viral reels
   right now (this month): caption look, pacing, transitions. Adopt current moves that fit the rules; never copy a brand.

## Step 7 · Build + storyboard ⛔
Build the edit with the editing kit: load `/mash-pro-editor` (Mash Pro + motion-fx + hyperframes skills; if the
kit is missing, use `/hyperframes` + `/vertical-edit`). Apply the chosen style's recipe from `references/styles.md`
and **every rule in `references/editing-rules.md`** (verbatim captions, transitions, safe zone, audio).
Before any render, export the storyboard: one **full-screen PNG per beat** (`npx hyperframes snapshot --at ...`),
named `NN_<time>s.png`, plus a contact sheet. Send them. Wait for approval; apply changes; re-send only changed frames.

## Step 8 · 720p preview ⛔
Render at `-q looks` (never draft), then `scripts/finalize.sh preview` → phone-safe 720p (H.264 Main + AAC 44.1k).
Send it. Ask them to watch it with sound and approve or list changes. Fix, re-render, repeat.

## Step 9 · 4K final
`npx hyperframes render <build> --resolution portrait-4k -q delivery --fps 30` using the **4K sources**, then
`scripts/finalize.sh final` → Premiere-safe 4K MP4 with the **original audio copied untouched**, saved to
`~/Downloads/<video title> - Clips/NN <clip name> 4K.mp4`. Tell the user exactly where it is.
Then offer the next clip ("Edit clip 2 the same way?").

## Never
- Never paraphrase captions; never show text that repeats what a graphic already says.
- Never add music or sound effects unless the user asks for them (Step 6 Personalize can ask).
- Never touch the original voice (no EQ, compression, normalising).
- Never render before the storyboard is approved, never render 4K before the 720p is approved.
- Never spend paid AI-generation credits without asking first with a cost.
