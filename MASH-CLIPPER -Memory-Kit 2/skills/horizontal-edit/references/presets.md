# Horizontal presets

## Creator Explainer (default for a creator talking to camera)
The look of a real creator channel launch (Hinglish talking head, edited end to end with this kit).
- **Palette from the room**: graphite stage #0B0D12, warm white text #F5F2EA, ONE accent picked opposite the room's
  light on the colour wheel (red/magenta room → ice cyan #3EE0FF; blue room → warm amber). Metallic gold only on
  words that literally say gold, and on the hero folder if it is called "golden".
- **Type**: Instrument Serif italic for small lead lines, Inter Tight 900 uppercase for the key word with a soft
  accent glow. Tracking about -0.015em, word-spacing .08em. Sentence/title-case sans labels. No mono kickers.
- **On screen**: English key words only (even when speech is Hindi/Hinglish), no caption track, a soft dark left
  scrim behind text on coloured walls. No grade, music or SFX unless asked.
- **Motion**: smooth `MK.zoom` on impact lines only, decoder text for a reveal word (`CF.decode`), strike-through
  then slam for "boring/wrong" moments, a cyan strike that later peels off for a payoff.
- **Signature beats** (pick by what is said):
  - "everyone says it" → 3 real social proof posts (`CF.post`, real handles visible)
  - "you can make this too" → PiP showcase: speaker shrinks bottom-right with an accent ring, real example videos
    fly in as a 3D fan on a graphite dot stage, a focus ring hops card to card with the creator's handle
  - "it's also boring" → the fan goes black and white and falls away
  - the product → a hero folder (`CF.folder`) that opens and fans out labelled papers; reuse it every time the
    product is named
  - "raw in, edit out" → a raw card slides into the folder, a finished card plays out of it
  - "just type it" → glass prompt bar types the command, send pulses
  - lists ("colour grading, sound design, motion graphics") → glass chips with accent ticks on each word
  - "start to end" → glass progress bar with a knob (`CF.progress`)
  - client feedback → WhatsApp-style chat (`CF.chat`); "it's 3 AM" → macOS menu-bar clock over a night/screen shot;
    "the render failed" → the real export window and error dialog
- **Rhythm**: a designed beat every 1-3 sentences, speaker-only stretches between them, 4-6 zooms per minute.

## Creator Light Studio (tutorials, reviews, screen recordings)
- Light aesthetic stage: warm off-white #F8F5F0 with soft peach / lavender / sky / butter blobs and a faint dot
  grid (`CF.lightStage`). Dark ink #1F1E1D text, one accent.
- The speaker eases into a **tall rounded box** on one side (`CF.camBox`, white 6 px ring, soft shadow) and the
  free side holds the screen recording (cropped to content), recreated app UI, cards or a phone frame with an
  example edit. Back to full frame (`CF.camFull`) for personal or emphatic lines.
- Light cards: white 92% with a 1 px #E8E4DC border and a soft violet-grey shadow, 20-28 px radius.
- Good beats: a mixer with faders gliding to trained levels (voice / SFX / music), an 80/20 split bar, a community
  card with a "Join for free" button pressed by a cursor, a subscribe button + bell, the creator's real IG profile.
- Leave the review side empty when the creator will drop their own screen recording in Premiere.

## Clean Talking Head
Footage graded slightly (+contrast, +saturation), vignette, light grain. One warm accent pulled from the set
(gold #ffc24b from trophies/wood) or a cool one on warm sets. Kinetic captions: Instrument Serif lead + Inter Tight
900 key word in the accent, lower band, scrim. Dark glass side cards (`.mk-dark`) with a small sentence-case label
+ bold title: ratings (stars pop), growth graph draw-on, profile card with counter, checklist chips with ticks, bar
chart. Smooth zoom on impact lines. A card every 1-2 sentences.

## Gadzhi Cinematic (business, luxury, agency)
Black with an oxblood or navy vignette, chrome/silver gradient type (Archivo Black Italic or Inter Tight 900 with
`.cf-silver`), Playfair Display Italic gold key words with glow. Floating proof screenshots with motion blur,
whip/zoom transitions (`MK.zoomThrough`), depth blur, price roll counters, grain. A cut every 2.5-3 s, long hold on
the offer.

## Vox Explainer (topic explainers, history, news)
Paper #f2f0eb background, yellow #f7d117 + red #c8102e. Archivo/Inter Tight 800 titles revealed letter by letter
with a yellow circle accent, archival photos cut out on yellow circles, squiggles and arrows drawing on, highlighter
sweep over screenshots and documents, map routes, Ken Burns on stills (~0.5 s per image in montages).

## Documentary Collage
Lilac or grey paper texture, black-and-white cut-out people, poster grids with barcodes and dot patterns, mask split
reveals, light-leak transitions, DM Serif Display + Inter Tight. A cut every 1.3-2 s.
