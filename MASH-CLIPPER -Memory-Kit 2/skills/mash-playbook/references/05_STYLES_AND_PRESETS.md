# 05 · Styles and presets

The user wants a MIX of styles inside one clip, not one look for 60 seconds. Pick the style they choose as the base and mix in other scene types.

## The 15 styles + Personalize (offered in the clickable picker)
1 Bold Hook (huge uppercase words, one yellow key word) · 2 Clean Creator (serif italic lead + bold key word, glass cards) · 3 Podcast Clip (speaker in a rounded card over a blurred copy of the shot, waveform, name tag) · 4 Cinematic Trailer (letterbox, filmic grade, sparse serif titles) · 5 Vlog Story (warm, handwritten captions, doodles) · 6 Luxury Minimal (B&W, small lowercase serif) · 7 Documentary Explainer (paper, taped prints, marker highlights) · 8 Tech/SaaS Explainer (dark UI, glass panels, cursor) · 9 Data Story (counters, charts) · 10 Kinetic Type (word stacks) · 11 Boxed Story (horizontal speaker box + real UI) · 12 Meme/Comedy · 13 Motivational Impact · 14 Minimal Subtitles · 15 Breaking News · 16 Personalize (colours, fonts, caption look, graphics amount, reference).
The picker (`mash-clipper/scripts/style_board.py`) renders all 15 on the user's own frame with captions under the chin, plus a clickable page with a Copy-prompt button. Their pasted prompt names clip + style: use it exactly.

## Documentary (the user's choice for interview clips): full recipe
- **Look:** warm paper stock + fibres + grain + soft vignette. Speaker's horizontal shot as a taped photo print (slightly rotated, a new angle each return). Ink captions with yellow marker highlights; red-pen handwritten notes (Caveat), newspaper cut-out words for harsh quotes (alternating cream/black/red blocks, each dropping in on its word), yellow sticky notes (Permanent Marker) for lists landing one by one as spoken, B-roll as taped prints with a paper label strip across the middle carrying the exact words + marker highlight, text cards for the unavoidable cut-aways.
- **Scene mix (example 60 s):** opening speaker full-frame vertical (host or hook) → full-frame vertical speaker with white captions on the chest → print + captions → kinetic cut-outs → print + sticky notes (print glides up so the group is centred) → B-roll print + label strip → text card → full-frame → B-roll → full-frame ending.
- **Transitions:** dip (old scene fades out ≈0.3 s, new scene fades in ≈0.4 s with a 1.035→1 scale settle). No slides, no overlaps.
- **Name note:** the speaker's name/title as a red-pen note once, the first time the print appears.
- **Cover:** side-by-side conversation cover for interviews (two equal taped prints, host left and guest right, facing each other, equal face size, names as red-pen tags), headline below with a marker highlight; or a single taped print + headline.

## Podcast-card (Style 3) recipe
Blurred, tinted copy of the horizontal shot as the background; speaker card (rounded, thin gold edge) 952x536 centred; name tag with dot; live waveform baked from the real audio (28 bars at 15 fps, smoothed); two-line captions under the card; slow sine breathe inside the card.

## Boxed Story recipe
Horizontal speaker in a framed 16:9 box (top for phone scenes, bottom for text scenes); real UI recreations (Instagram-style feed on an iPhone frame, chats, cards); boxed uppercase captions with a key block in the accent colour; vertical ↔ box via fade-out/fade-in (never both visible).

## Mash Pro kit (the effects engine, `/mash-pro`, `/mash-pro-editor`)
Text animators: rise, blur, pop, drop, flip, slide, mask, wave, stretch, glow, cascade, tracking, scramble, typeOn. Exits: blur, up, down, mask, shrink. Presets: title, lowerThird, callout, transition (whip, zoom, push, circle, blur, flash, glitch), endCard, quote, steps. Shakes, backgrounds, maps, data charts, SaaS screen moves, beat sync, silence cut (+Premiere XML), resize. Use `blur` for captions, `slide` for label strips, `mask` only for short titles. Punchy ones (shake, scramble, drop) only for hype topics.
The 12 Mash Pro presets: Reel Hook, YouTube Explainer, SaaS Launch, Apple Glass, Vox Map, Data Story, Beat Edit, Podcast Clip, Real Estate, Construction, Creator, Bold Impact.

## Skills that make up the kit (all in `skills/`)
`mash-clipper` (front door for clipping), `mash-pro-editor` + `mash-pro` (effects/presets), `motion-fx`, `motion-theme`, `vertical-edit`, `horizontal-edit`, `edit-director`, `edit-qa`, `sound-design`, `saas-motion`, `hyperframes` (+cli, registry), `caption-animation`, `kinetic-typography`, `lower-thirds`, `logo-animation`, `color-motion`, `beat-sync-editing`, `captions-overlay`, `talking-head-recut`, `cut-the-curve`, `seam-craft`, `motion-doctrine`, and ~30 more motion/animation skills. `mash-playbook` (this memory) tells the AI how to use them the way this user wants.
