# Finding clips that hold attention

> **INTERVIEWS / PODCASTS (user correction):** a clip must contain the QUESTION and the guest's ANSWER, both people visible. Never ship a clip where only the host asks, or only the guest talks. If the user names a "main" person, they carry the hook; the answer is the payoff. Identify who is who first (one short question if unsure). Details: `mash-playbook/references/03_CLIP_FINDING_RULES.md`.

A clip is a **complete mini-story**, not a random 45-second window. Build it from the strongest lines in the
whole video, even when they sit minutes apart, and stitch them in story order.

## The 4 parts (every clip has all four)
| Part | Length | What it must do |
|---|---|---|
| **Hook** | first 0-3 s | One line that stops the scroll on its own: a bold claim, a "number one rule", a surprising contrast, a question the viewer wants answered. No warm-up words ("so", "okay", "um", "and"). |
| **Body** | 15-40 s | The why or the example that makes the hook make sense: the mistake people make, the story, the before/after. Concrete beats abstract. |
| **Payoff** | 3-8 s | The realisation that closes the loop the hook opened ("…and they already trust you enough to buy it"). The strongest line in the clip usually lives here. |
| **CTA / ending** | 1-5 s | A clear last line: an instruction, a punchline, or the payoff itself. Never end mid-thought, on "so…", or on a dry technical line. |

Target length 30-60 s (hard max 75 s).

## How to search
1. Read the whole `lines.txt`. List every candidate **hook line**, **payoff line** and **ending line** with times.
2. For each hook, find the body lines that explain it and the payoff that resolves it (search the whole video).
3. Prefer one continuous stretch when it already has all four parts; otherwise stitch 2-6 segments.
4. Reorder segments when the story reads better (e.g. hook → the mistake → the fix → the result), but never
   change a sentence's meaning or splice half-words.
5. Skip: retakes (keep only the last good take), false starts, dead air, sponsor reads, other people talking,
   anything that needs earlier context to understand.
6. Score each candidate 1-10 on: hook strength, stands alone, payoff, ending, pace. Keep the top N, no two
   clips sharing the same hook. Overlapping body lines between clips are fine only if the user is told.

## Cut points (word-accurate)
- Start each segment ~0.05-0.10 s before its first word's start; end ~0.10-0.25 s after its last word's end.
- Never cut inside a word. If the next word starts < 0.12 s after, cut in the middle of that gap.
- Drop a filler word at a segment start ("so", "yeah", "and", "but") when the line reads fine without it.
- After stitching, **always** run `verify.py` and read every clip's text: fix any clipped word, stray syllable or
  sentence that no longer makes sense, then rebuild that clip.

## cuts.json
```json
[
  {
    "name": "Describe The Problem Better",
    "hook_text": "The number one law of sales",
    "key_word": "law",
    "frame_at": 1.5,
    "segments": [
      [276.00, 286.65, "hook"],
      [353.35, 362.55, "body"],
      [300.85, 320.62, "body"],
      [292.88, 300.45, "payoff"]
    ]
  }
]
```
`segments` are `[start, end, role]` in source seconds, in the order they play. `frame_at` is a moment (clip
seconds) with the speaker clearly in frame, used for the style board.

## Presenting clips to the user
For each clip: number, name, length, the hook line in quotes, a one-line "what it's about", and the
payoff/ending line. Then your recommended first clip and why (strongest hook in the first 3 s).

## Segment tags (cuts.json)
`[start, end, role, who]`: `who` = `light`/`dark` (clothing brightness) tells the cutter which person to centre when two people share a shot; omit for the biggest face. The cutter splits every segment at camera cuts and frames the speaker per shot, then you verify with a contact sheet.

## Trimming
After cutting, run `verify.py`, read each clip, and trim: pauses > 0.35 s (keep ~0.2 s), stammers, repeated words, stray syllables at joins. Rebuild the clip and re-time the edit from the source-based time map.
