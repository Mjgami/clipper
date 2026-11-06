# 04 · Editing rules (follow every one, on every edit)

## RULE #1: nothing ever covers a face
No caption, card, sticker, icon or graphic touches the face, mouth or beard at any moment of a beat. Check at 3 points per beat (start+1 s, middle, end-0.4 s): people lean and move. Captions live on the chest just under the chin. Side cards stay under ~500 px wide. If the layout cannot keep the face clear, put the speaker in a box/print and the graphics around it.

## Framing
- **Vertical full-frame is the default** and the reel starts on it (or on the opening speaker). The start is the spoken line as a normal caption: NO extra title card, kicker, or big headline before the first words.
- When the speaker sits inside a box/print/card, use the **original horizontal footage** in a 16:9 box. Never a crop of the vertical clip in a box, never a tight face crop.
- Phone/UI scenes: speaker box on top, then the phone zoomed in large below. The phone may run off the bottom (only white area is lost); what matters (image + the caption being read) stays in the safe zone. Phone screens must never flash white: no 3D tilt (rotationX) on phones/cards that contain images, images `decoding="sync" loading="eager"`.
- Safe zone for all text/graphics in 1080x1920: x 64-1016, y 250-1500 (tighter x 150-930 / y 210-1530 for guide-box clients). Video may bleed, text may not. Nothing touching an edge.
- Centre the layout vertically. No empty top with everything crammed at the bottom, and no stacks of tags at the bottom. When a scene changes the stack height (e.g. notes appear), move the main element so the whole group stays centred.

## Captions (most important)
- The speaker's EXACT words, in order, in the language spoken. Never paraphrase or invent a headline in place of speech. Only censor with an asterisk if needed (f*ck).
- A phrase (2-4 words, break at punctuation) appears whole, starting ON its first spoken word (not before, never early), and leaves before the next one. Never two caption blocks at once. Never an empty or half-filled box.
- Captions must be fully readable and finished appearing before the speaker finishes the line; they leave when the line is over.
- No captions while a graphic already shows the same words (no repeats). Do not repeat the same word twice on screen.
- Highlights (marker/colour on key words) draw only AFTER the line has fully appeared, on the right word (the meaning word, one or two per phrase).
- Position: on the chest under the chin for full-frame shots; in the middle band for B-roll images (with a soft dark band behind for contrast, lifted so it never sits on a child's/person's face); under the picture for card/print scenes.
- Fonts: tight tracking, natural word spacing, no wide-tracked mono labels, no pills/capsules, no decorative sublines that add nothing.

## Motion & transitions: smooth, always
- Every transition must be invisible-smooth. The reliable pattern: the old scene fully fades out (≈0.3 s), then the new scene fades in with a gentle scale settle (≈0.4 s). Never overlap two scenes (double-exposure), never slide paper over footage, never crossfade two semi-transparent layers.
- Gate every graphic/caption: nothing starts before its scene has landed (otherwise captions ghost over the previous scene).
- One zoom system, on an inner layer. Calm sine zooms (1.04-1.08x), in AND out. No hard punch-ins, no jump cuts introduced by zooms.
- No blur filters on running text (it "juggles"), no animating layout properties (left/top/width), transforms + opacity only. Mash Pro `blur` rise for captions and `slide` for label strips are the approved text animators; exits are a soft blur-up.
- Every graphic animates in AND out (no static cards, no plain fades for graphics). Text leads speech slightly and stays visible long enough to read.
- Explicitly hide every element at t=0 (`tl.set(el,{opacity:0},0)`) and use `immediateRender:false` on later tweens, so nothing leaks into earlier frames.
- Calm / sensitive topics (mental health, grief, sleep): slow blur-fades, sine easing, no shakes/pops/bounce/scramble/whips, muted colours; zooms smooth and slow.

## Visuals
- Every visual matches the exact words at that moment. Prefer real UI (phone feed, chat, dashboard) or relevant B-roll over generic cards. Use B-roll/photos to avoid a "one-sided" look: mix full-frame shots, boxed/print shots, text cards, kinetic type, lists and B-roll in one clip so retention does not drop.
- B-roll: free/unlimited image generation (Seedream with Unlimited ON) or the user's own assets. Prompts describe the scene and end with "no text, no logos, no brand marks". Check each image for logos/garbled text. Every B-roll image gets a slow zoom + gentle pan (alternate direction).
- No empty cards (fill with an icon/image), no rotated "stamp" badges, one margin grid, nothing overlapping text. Story graphics must match the story's art style.
- Brand colours/fonts: if the work is for a client use ONLY that client's kit; one video = one brand. For personal/unknown projects derive the palette from the footage and use a font pair.

## Audio
- The original voice is NEVER processed (no EQ, compression, denoise, normalisation). Final audio = the clip's original audio stream copied (`-c:a copy`).
- No music and no sound effects unless the user asks (an earlier version with SFX + music was called "the worst"). If asked: music very soft under the voice, SFX low (-17 dB), each on its visual hit frame.
- Previews for the phone are encoded so they are audible (AAC 44.1 kHz stereo, loudness-normalised copy) but the master keeps the untouched audio.
