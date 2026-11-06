---
name: mash-pro
description: Mash Pro effects pack for the Claude Motion Kit. One-line presets (titles, lower thirds, callouts, 7 scene transitions, end cards, quotes, numbered steps), animated maps (fly-to, route draw, pins, country highlight), data graphics (bars, rings, line charts, rolling numbers), beat-synced shakes and flashes, silence cutting, aspect resizing, SaaS screen moves (3D rise, unfold, flip, smooth zoom, cursor clicks, 3D carousel, orbit, parallax, fan stack), backgrounds from the footage palette (fluid, aurora, radial, linear, spotlight, background switches, light leaks), camera shakes (bounce, lens, warp, wave, squeeze, glitch, invert, white/dark flicker, rumble...), text animators (scramble, typeOn, mask, flip, drop, stretch, cascade, glow, tracking...) and one-call impacts (word + shake + SFX cue on the same frame). Use whenever an edit asks for a shake, a camera hit, a text animation style, a glitch or a flicker, or names a Mash Pro effect. Works inside any MotionKit/HyperFrames composition on Mac and Windows.
---

# Mash Pro

Runtime: `assets/mashpro.js` (needs GSAP, loaded after `motionkit.js`). Copy it into the project folder and add
`<script src="mashpro.js"></script>` (for maps also copy `assets/mashworld.js` and load it before mashpro.js). Live preview of every effect: `storyboard/index.html` (serve the skill folder
over http and open `/storyboard/`).

```js
const tl = gsap.timeline({ paused: true });
const MK = MotionKit(tl, { fps: 30 });
const MP = MashPro(tl, { fps: 30, width: 1920 });   // width = composition width, scales shake strength

MP.shake("#cam", 3.20, "lens");                     // camera hit on the impact frame
MP.text("#hook", 0.40, "scramble");                 // text animator, returns the time it finishes
MP.textOut("#hook", 2.80, "mask");                  // exit
MP.impact("#word", "#cam", 4.10, { text: "pop", shake: "bounce" });  // word + shake + ONE sfx cue
// at the end, save MP.cuesJSON() into cues.json for /sound-design (merge with your own CUES)
```

## Mash Shake: `MP.shake(target, t, type, {amp, dur, seed, sfx})`
Target the camera wrapper (`.mk-cam`) for a full-frame hit, or any card/word for a local hit. `amp` 0.5 = subtle, 1 = default, 1.6 = heavy.

| type | look | sfx cue |
|---|---|---|
| `basic` | decaying handheld jolt | hit |
| `quick` | 4-frame snap | hit |
| `rumble` | low continuous shake (`dur`) | hit |
| `bounce` / `bounce2` | vertical drop and spring / scale pulse | hit |
| `lens` | zoom kick with blur, settles back | hit |
| `warp` | skew wobble | whoosh |
| `wave` / `wave2` | sideways / vertical sway with tilt | whoosh |
| `squeeze` / `squeeze2` | wide-squash / tall-squash spring | hit |
| `invert` | 2-frame colour invert flicker | hit |
| `glitch` | RGB split + frame jumps | click |
| `whiteFlicker` / `darkFlicker` | exposure flicker up / down | shimmer / hit |

## Mash Type: `MP.text(target, t, style, {each, dur, by, from, seed, sfx})`
Splits the element into words and letters once (text still wraps normally). `from`: start, end, center, random.

| style | unit | look |
|---|---|---|
| `rise` | words | slide up + fade |
| `blur` | words | blur-in rise (best for serif lead lines) |
| `pop` | letters | scale pop with overshoot |
| `drop` | letters | fall from above with a bounce |
| `flip` | letters | 3D flip up |
| `slide` | words | fast slide from the right with blur |
| `mask` | words | revealed from below a clean edge |
| `wave` | letters | rise with a slight rotation ripple |
| `stretch` | letters | elastic stretch into shape |
| `glow` | words | overexposed glow settling to normal |
| `cascade` | letters | random-order blur drop |
| `tracking` | whole line | wide spacing closing to normal |
| `scramble` | letters | random glyphs decode into the word |
| `typeOn` | letters | typewriter |

Exits `MP.textOut(target, t, style)`: `blur`, `up`, `down`, `mask`, `shrink`.

## Mash SaaS (phase 2)
Use real UI screenshots (`<img class="ui">` with border-radius + shadow) inside a centred flex stage with `perspective`.
Never put transforms on the stage itself; Mash Pro animates the screens.

| call | look | sfx |
|---|---|---|
| `MP.screen(sel, t, style, {radius, each, dur})` | entrances: `rise3d`, `unfold` (rounded clip from centre), `zoomOut`, `flipIn`, `slideUp`, `pop`. Several matches enter `each` apart | whoosh / swipe / pop |
| `MP.zoom(sel, t, {x:"70%", y:"30%", scale:1.8, dur, hold})` | smooth zoom into a spot, back out after `hold` (no hard punch-ins) | whoosh |
| `MP.cursor(parent, [[t, x, y, click?, targetSel?], ...], {size})` | arrow glides between points, presses, ripple, target dips | click on each click |
| `MP.carousel(items, [[t, index], ...], {mode:"flow"/"ring", dur})` | 3D cover-flow or ring that rotates to each index | swipe |
| `MP.orbit(sel, t, {dur})` | slow floating 3D camera drift on a panel | none |
| `MP.parallax(sel, t, {dur, dist})` | layers with `data-depth` 0..1 slide at different speeds | none |
| `MP.fan(sel, t, {gap, spread})` | stacked screens fan out like cards | whoosh |

## Mash BG (phase 2)
1. Get colours from the footage: `python3 scripts/palette.py clip.mp4 --at 3.5 --out palette.json`
   gives `{"colors": [base, c1, c2, accent]}`: base is a deep version of the shot's darkest tone, accent its most vivid colour.
2. `MP.bg(container, {colors, style, t, dur})` with style `fluid`, `aurora`, `radial`, `linear` or `spotlight`.
3. Switch background every 1 to 2 lines: `MP.bgSwitch(container, t, {colors, style, transition:"circle"/"wipe"/"blur"/"fade", at:"30% 60%"})`.
4. `MP.lightLeak(overlayContainer, t, {color, dur, peak})` sweeps a warm leak over footage (overlay container above the video).
Every drift is seeded and driven by the timeline, so backgrounds render the same every time.

## Mash Map (phase 3)
Load `mashworld.js` (177 countries, Natural Earth public domain, works offline). Make calls in time order.
```js
const m = MP.map("#mapbox", { center: [10, 25], zoom: 1, colors: { sea, land, stroke, route, pin } });
m.flyTo(0.3, [79, 22], 4.2, { dur: 1.6 });     // smooth pan + push-in (whoosh)
m.highlight(1.7, "India");                       // country fills with the accent and glows (shimmer)
m.pin(2.1, [72.88, 19.08], "Mumbai");            // dot pops, ring pulses, label rises (pop)
m.route(2.4, [72.88, 19.08], [55.27, 25.2], { dur: 1 });  // curved glowing line with a moving head (swipe)
```
Country names follow Natural Earth (`m.countries` lists them, e.g. "United States of America", "United Kingdom").
Pins, routes and labels stay the same size at any zoom and ride along with every camera move.

## Mash Data (phase 3)
| call | look |
|---|---|
| `MP.count(sel, t, from, to, {dur, prefix, suffix, decimals})` | rolling number, pop cue as it lands |
| `MP.bars(container, t, [{label, value, color?}], {color, suffix, each})` | bars grow one after another with live values |
| `MP.ring(container, t, pct, {label, color})` | progress ring draws with the % counting up |
| `MP.line(container, t, [values], {color})` | smooth line chart draws with an area fill and end dot |
Use only real numbers from the script or the client. Never invent stats.

## Mash Beat (phase 3)
`python3 scripts/beats.py music.mp3 --out beats.json` gives `{bpm, beats, downbeats}` (tested: 96 and 124 bpm found exactly,
beats within ~10 ms of the hit). Then:
`MP.beatShake("#cam", beats, "quick", {amp: 0.5, every: 1, from, to})`, `MP.beatFlash("#flash", beats, {every: 2})`,
or `MP.onBeats(beats, (t, i) => ..., {every: 4})` for anything else. Use downbeats for big hits. Beat effects log no SFX
(the music already hits there).

## Mash Tools (phase 3)
| script | what it does |
|---|---|
| `scripts/silence.py clip.mp4 --xml cut.xml` | cuts every silent gap (`--db -35 --min 0.35 --pad 0.08`), renders `clip_cut.mp4`, writes `keep.json` and a Premiere/Resolve XML that points at the ORIGINAL file so every cut can be reopened. Only gaps: choosing takes stays a judgement call |
| `scripts/resize.py clip.mp4 --to 9:16 --focus 0.4` | reformat to 9:16, 16:9, 1:1 or 4:5. `crop` keeps the --focus point (put it on the speaker), `--mode fit` shows the whole frame over a blurred copy |
| `scripts/beats.py music.mp3` | beat grid for Mash Beat |
| `scripts/palette.py clip.mp4` | colours for Mash BG |
Auto captions and background removal already exist in the kit: `motion-fx/scripts/words.py` and `npx hyperframes remove-background`.

## Mash Presets (phase 4)
One line each. Fonts and colours come from the project theme (`--mk-display`, `--mk-serif`, `--mk-accent`), text gets a soft
shadow so it reads on any background, and there are no boxes.

| call | what you get | sfx |
|---|---|---|
| `MP.title(layer, t, {lead, word, sub, at:"bottom", cam:"#cam", shake:"lens", hold})` | serif lead line, big key word that hits with a camera shake, optional sub line | hit |
| `MP.lowerThird(layer, t, {name, role, side, hold})` | accent bar draws, name rises from a mask, role blurs in (bottom band, never on the face) | swipe |
| `MP.callout(layer, t, {x, y, text, dx, dy, hold})` | dot pops on a point, line draws, label rises | pop |
| `MP.transition(sceneA, sceneB, t, type)` | `whip`, `zoom`, `push`, `circle`, `blur`, `flash`, `glitch`. Put each scene in its own full-frame div | whoosh / swipe / hit |
| `MP.endCard(layer, t, {line, cta, handle})` | closing line, call to action with a drawn underline, handle | pop + swipe |
| `MP.quote(layer, t, {text, by})` | big serif quote mark, words blur in, attribution | shimmer |
| `MP.steps(layer, t, ["Hook", "Story", "Offer"], {each})` | numbered list, one item per beat | pop each |

## Sound cues
Every call logs its cue. Save `MP.cuesJSON()` as `cues.json` for /sound-design: it merges cues closer than 0.15 s and keeps
the strongest (hit > whoosh > swipe > pop > click > shimmer), so stacked effects never smear into one noise.
Render test (12.6 s, map + data + presets): all 12 SFX landed 0.0 ms from their frame, QA passed.

## Rules
- Shakes only on real impact moments (a key word, a cut, a reveal). Max one heavy shake per 3 to 4 seconds.
- Text animators follow the house rules: key words in the bottom band or upper chest, never over the mouth or face.
- Every Mash Pro call logs its SFX cue on the exact frame. Use `sfx: false` to skip one. SFX stay at -17 dB via /sound-design.
- All randomness is seeded: the same project renders the same shake every time. Pass `seed` to get a different variation.
- Nothing uses GSAP callbacks: maps, carousels and numbers are baked frame by frame, so they render correctly however the
  engine seeks (forwards, backwards, events suppressed).
