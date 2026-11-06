# 03 · Finding and cutting clips (the rules the user corrected us into)

## A clip is a complete mini-story
Hook (0-3 s) → body → payoff → ending. Never a random window. Build it from the strongest lines anywhere in the video and stitch them in story order. Target 30-60 s, hard max about 90 s for a Q&A clip. The last line must close the thought (never end mid-sentence, on "so...", or on a dry technical line).

## INTERVIEWS / PODCASTS: the full exchange, always  (biggest correction)
The user rejected clips where only one person talked ("you are just making him ask the questions, it doesn't work like this"). Rules:
- A clip from a conversation contains **the question AND the guest's answer**: the host asks (shortened to the sharp version of the question), then the answer lands. Both people are visible and audible.
- If the user names the host they want as the "main" person, that person must carry the clip (their question is the hook, they frame the exchange) but the answer from the other person is the payoff. Never deliver a clip with only the question, or only the answer without its question, unless asked.
- Identify who is who first: ask or deduce from the video (host = the one who mostly asks; guest = the one who explains). Confirm names with ONE short question if unsure.
- Pick answers that are self-contained, confident and quotable. A good hook is a question that names a fear or myth ("is my money safe if the company shuts down?").
- The question may be trimmed to its core, but never cut so the answer no longer makes sense.

## Speaker-aware framing (multi-camera podcasts)
Podcasts switch between a two-shot and single shots. One fixed vertical crop frames the wrong person. The cutter must:
1. Split every segment at camera cuts (scene detection).
2. In each piece, find faces and centre the 9:16 crop on the right person (tag each segment with `who`: `light`/`dark` clothing hint, or none = biggest face).
3. Verify with a contact sheet of ~10 frames per clip: the speaker must be centred and fully in frame in every shot.
The horizontal version is the untouched original framing.

## Language handling (Hindi / Hinglish / mixed)
- Whisper "auto" translates or loops on mixed speech. Use `language="hi"`, model `large-v3-turbo` for the full pass, `large-v3` for hard stretches.
- Also download the platform's own captions (yt-dlp `--write-auto-subs`, `captions_to_lines.py`) and READ the video from those; use Whisper only for word timings of the chosen stretches.
- When verifying a join, compare BOTH transcripts: a short English phrase missing from one is not necessarily a bad cut.
- On-screen captions: Roman Hinglish exactly as spoken (Hindi words in Roman script, English words as English). Never paraphrase into a headline.

## Trim what is not content (they flagged this repeatedly)
- Long pauses (> ~0.35 s) inside a line: cut to a natural breath (~0.2-0.25 s). Use `ffmpeg silencedetect=n=-32dB:d=0.3`.
- Stammers, repeated words, false starts ("constant... emo... "), throat clears, stray syllables from a previous sentence at a join: cut them. Listen for them in the re-transcription of each finished clip.
- Keep genuine ad-libs/jokes. Keep only the LAST clean take when a line is repeated.
- Never cut inside a word: start 0.05-0.10 s before the first word, end 0.10-0.25 s after the last word. Drop a leading filler ("so", "and", "but") when the line reads fine without it.
- After every cut run the re-transcription check and read each clip start to end; fix clipped words or stray syllables, then rebuild that clip.
- If a clip arrives already cut by the user, do NOT cut it again: graphics only.

## Hiding unavoidable jumps
A source cut-away (the other person for one second) or a trimmed pause inside one continuous shot shows as a jump. Hide it behind a scene change, a text card with the speaker's exact words, or a B-roll/print scene. Never leave a visible jump in a full-frame shot; if one remains, cover it with a gentle zoom.

## cuts.json
```json
[{"name":"Clip name","hook_text":"...","key_word":"...","frame_at":2.0,
  "segments":[[start,end,"hook","light"],[start,end,"body"],[start,end,"payoff"]]}]
```
Segments are source seconds, in play order. The 4th item (`who`) is optional.
