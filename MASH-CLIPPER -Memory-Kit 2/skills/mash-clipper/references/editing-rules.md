# Editing rules (learned the hard way; follow every one)

## RULE #1 · Nothing ever covers the face
- No caption, card, sticker, icon or graphic may touch the face, mouth or beard - at any moment of a beat.
- Captions live **on the chest, just under the chin** (measure the chin at the tightest zoom; leave ~40-60 px).
  If the chest is busy (hands), use the clear wall space above the head only for a short title, never captions.
- Check face clearance at 3 points of every beat (start + 1 s, middle, end − 0.4 s): people lean and move.
- Side cards stay ≤ 500 px wide and clear of the face for the whole beat; otherwise move the speaker into a box.

## Quality bar (every frame)
- Real UI and real-looking visuals that match the exact words being said (a phone feed when they talk about ads,
  a chat when they mention a message) - never generic stand-ins, never a card that contradicts the line.
- Every graphic is animated in AND out (no static cards, no plain fades), text leads speech slightly and stays
  fully readable ≥ 2 s before it leaves.
- Clean human typography: tight letter-spacing, natural line gaps, no tiny floating text in big empty space,
  no pill/capsule labels or decorative sublines that add no information, strict alignment to a 64 px grid.
- Fill cards: no empty boxes; use a real screenshot, a generated image (free/unlimited only, ask before credits)
  or an icon.
- Story graphics match the story's art style; keep one look per video.
- For a client video use only the client's brand kit (colours, fonts, logo). One video = one brand.

## Framing
- **Vertical full-frame is the default.** The clip starts on the full vertical shot with captions.
- When the speaker sits inside a **box or shape** (picture-in-picture, top box over a phone, bottom box under a
  card), use the **horizontal 16:9 clip** in a 16:9 box. Never squeeze a crop of the vertical clip into a box,
  never a tight face crop.
- Switch vertical ↔ box with a quick, clean move: the vertical shot pulls back and fades (~0.25 s), the box
  pops in (~0.5 s, expo-out). Both shots must never be visible at the same time.
- Phone / UI scenes: speaker box on top, a short headline under it, then the phone zoomed in large. The phone may
  run off the bottom of the frame; what matters (image, caption the speaker reads) stays inside the safe zone.
- Safe zone for any text/graphic (1080x1920 space): x 64-1016, y 250-1500. Video may bleed. Nothing on the face.

## Captions (most important)
- Captions are the speaker's **exact words**, in order, on their word timestamps. Never paraphrase, never write
  your own headline in their place. Fix only obvious transcription errors (listen if unsure).
- Show a whole phrase (2-4 words, break at punctuation) at once, a hair before it's spoken; next phrase replaces it.
  Never two caption blocks on screen together, never an empty/half-filled block.
- **No repeats:** while a graphic already shows the words being said, hide the captions.
- Swear words: keep them unless the user asks; if the platform is a concern, an asterisk (f*ck), never a new word.
- Key words may get the style's accent colour; don't overdo it (one per phrase at most).

## Motion = smooth, always
- No animation may start before the scene it belongs to has fully landed (gate graphics after every transition).
- No 3D tilt (rotationX) on phones or cards that contain images: Chrome drops the layer and it flashes white.
  Use y / scale / opacity. Images: `decoding="sync" loading="eager"`.
- Every element starts hidden at t=0 explicitly (`tl.set(el, {opacity:0}, 0)`) so nothing leaks into earlier frames.
- One zoom system only, on an inner layer; never animate the same layer from two systems.
- No blur filters on text (looks juggly), no layout properties (left/top/width) in tweens: transforms + opacity only.
- Smooth eased zooms on impact lines only (≤1.1x), never hard punch-ins unless the style is Meme.
- Check every transition at 3-4 points (start, middle, end) on snapshots before rendering.

## Audio
- The original voice is never processed (no EQ, compression, normalising, noise removal).
- **No music and no sound effects by default.** Add them only if the user asks; then music very soft under the
  voice and SFX low, each on its visual hit.
- Final audio = the clip's original audio stream copied (`-c:a copy`).

## Delivery
- Approval gates: raw clips → style → PNG storyboard → 720p preview → 4K.
- Storyboard = full-screen 1080x1920 PNGs, one per beat, named by order and time, plus a contact sheet.
- Previews for phones: 720x1280, H.264 Main 4.0, AAC 44.1 kHz stereo, faststart (`finalize.sh preview`).
- 4K: render with 4K sources, `--resolution portrait-4k -q delivery`, then `finalize.sh final` (1 s keyframes,
  closed GOP: plays smoothly in Premiere/Resolve).
- Always tell the user the exact folder and file name of every deliverable.
