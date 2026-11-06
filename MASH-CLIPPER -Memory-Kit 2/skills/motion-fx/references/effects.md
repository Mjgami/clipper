# Effects catalog

Fit: ● native ○ works well · rarely. All effects work at every aspect; sizes below are for 1080-wide (9:16) or
1920-wide (16:9) canvases. Cue = the SFX type `/sound-design` should place at the impact time.

| Effect | Vertical | Horizontal | SaaS | Cue |
|---|---|---|---|---|
| Kinetic captions (serif lead + big key word) | ● | ● | ○ | none (words) |
| Giant word behind the subject | ● | ● | · | hit |
| Strike-through on a negative word | ● | ● | ○ | swipe |
| Punch-in / punch-out cut | ● | ● | · | whoosh / swipe |
| Glass side card | ○ | ● | ● | pop |
| Checklist chips with ticks | ● | ● | ● | click |
| Red X chip (what you DON'T do) | ● | ● | ○ | pop |
| Status card (e.g. "MLS · waiting…" then crossed) | ● | ● | ○ | pop + click |
| Counter / price roll | ● | ● | ● | pop |
| Graph line draw-on + dot | ○ | ● | ● | swipe |
| Bar chart grow | ○ | ● | ● | pop |
| Target ring + avatars | ● | ○ | ○ | hit + shimmer |
| Hearts / emoji float | ● | ● | · | none or pop |
| Prompt bar typing + cursor click | ○ | ● | ● | hit (click) |
| 3D tilted dashboard settles flat | ○ | ○ | ● | whoosh |
| Zoom-through transition | ● | ● | ● | whoosh |
| Progress steps with ticks + % | ○ | ● | ● | click per step |
| Logo orbit + wordmark sheen | ○ | ● | ● | hit + shimmer |
| White flash on a punchline | ● | ○ | ● | hit |
| Grain + vignette | ○ | ● | ○ | none |
| Glow blobs + grid background | ○ | ○ | ● | none |

## Recipes

### Kinetic captions
```html
<div class="mk-scrim"></div>
<div class="mk-caps" id="caps" style="left:150px;width:780px;top:1250px;height:280px"></div>
```
```js
MK.captions({ words: WORDS, container: "#caps", end: DUR, hide: [[2.16, 3.12]] });   // auto key word
MK.captions({ words: WORDS, container: "#caps", end: DUR, keys: new Set([0, 9, 11]) }); // hand-picked key words
```
Sizes: 9:16 lead 64px / key 104px; 16:9 lead 56px / key 92px (set `--mk-cap-lead`, `--mk-cap-key` on #caps).
Hide captions while a giant word owns the frame (`hide`). Hand-pick keys when the auto pick is weak ("PUTTING").

### Giant word behind the subject
1. Cut the subject out for that time range: `npx hyperframes remove-background seg.mp4 -o cutout.webm --quality best`
   (cut `seg.mp4` from the source first, same start time).
2. Stack inside the camera wrapper: `<video src=source>` → `<div class="mk-big">HOPE</div>` → `<video src=cutout.webm>`.
3. Place the word so the subject's head overlaps its lower third. Put lead lines OUTSIDE the wrapper (front layer).
```js
MK.slam("#hope", 2.16); MK.strike("#strike", 2.72);   // #strike: ink bar, transform-origin 0 50%
```

### Zooms (talking head)
Default: smooth eased zooms on impact lines only (a handful per minute). Hard punch-in cuts read as jump cuts when
someone speaks with force, so use them only when the user asks for punchy cuts.
```js
MK.zoom("#cam", 4.7, { to: 1.1, origin: "50% 32%", inDur: 0.7, hold: 1.4, outDur: 0.8 });  // impact line
MK.zoom("#cam", 12.8, { from: 1, to: 1.05, inDur: 3.6, hold: -1 });                         // slow push, no return
```
Origin = the face. Don't zoom every time text appears, and don't hold a constant "face right, text left" reframe.
Normal framing + text sized to fit the empty wall is the default.

Punchy jump cuts (only on request):
```js
MK.camera("#cam", [
  { t: 0,    scale: 1.14, origin: "50% 40%", push: { to: 1.18, dur: 3.4 } },  // base zoom also crops edge watermarks
  { t: 3.6,  scale: 1.3,  origin: "50% 30%" },
  { t: 7.68, scale: 1.14, origin: "50% 40%" },
]);
```
Base zoom ≥ 1.1 hides corner watermarks.

### Glass side card (YouTube)
```html
<div class="mk-card mk-dark" id="gig" style="left:1520px;top:230px;width:300px">
  <div class="mk-kick">Gig</div><div style="font-weight:800;font-size:29px">Instagram growth</div>
</div>
```
```js
MK.cardIn("#gig", 2.16, 60); MK.cardOut("#gig", 4.4, 60);   // +x from the right, -x from the left
```

### Checklist chips
```html
<div class="mk-chip mk-dark" id="c1"><span class="mk-tick"><svg viewBox="0 0 30 30"><path id="k1" d="M7 15.5 L13 21 L23 9"/></svg></span>Professional photos</div>
```
```js
CHIPS.forEach(([sel, tick, t]) => { MK.chipIn(sel, t); MK.draw(tick, t + 0.1, 0.22, 30); });
```
On bright footage use `.mk-dark` chips; on dark footage `.mk-glass`.

### Counter
`MK.counter("#fol", 2.1, 12.4, 6.95, 1.4, v => v.toFixed(1) + "K");` — tell the user if numbers are illustrative.

### Prompt bar + click (SaaS)
```js
MK.type("#ptyped", "make a 15s ad for Your Brand", 0.35, 0.045); MK.blink("#caret", 1.6, 5);
MK.click("#cursor", "#ripple", "#gen", 2.4, { x: 80, y: -262 });  // move = offset from the cursor's CSS position to the button
```

### 3D dashboard → zoom through
```js
MK.tiltIn("#dash", 3.55);  // wrapper needs perspective: 1400px
tl.fromTo("#dash", { scale: 1 }, { scale: 1.07, duration: 5.2, ease: "sine.inOut", immediateRender: false }, 3.65);
MK.zoomThrough("#dash", 8.9);  // the push must END before the zoom-through starts (lint: overlapping tweens)
```

### Progress steps
Track + fill (`transform-origin:0 50%`, `scaleX` 0→1 over the sentence), 4 nodes with `.ok` overlays popped at each
word, a `%` counter (`MK.counter("#pct",0,100,t,dur,v=>Math.round(v)+"%")`), label flips to "Ready".

### Logo orbit
Ring + N glass tiles at `cos/sin` positions around the logo; rotate the ring container +60° over the outro and
counter-rotate each tile −60° so icons stay upright. Logo: `fromTo` scale .4 rotation −30 blur → 1. Wordmark sheen:
a skewed white gradient bar inside a div masked by the wordmark PNG (`mask-image`), moved across with `x`.
Letter-spaced word (MEDIA): split into spans and animate each span's `x` (never `letterSpacing`).

### Target ring + avatars
SVG circles drawn with `MK.draw` (r118 → length 742), bullseye `MK.pop`, 3 avatar circles popped with 0.08 s stagger.

### Grain, flash, glow
```html
<div class="mk-grain" id="grain"></div><div class="mk-flash" id="flash"></div>
```
`MK.grain("#grain", DUR)`, `MK.flash("#flash", 12.0)`, blobs: `.mk-blob` + `MK.drift`.
Grain makes files big: finalize with `--target youtube` (bitrate cap).

### Remove a static logo from the background
`python3 ../horizontal-edit/scripts/remove_logo.py clip_1080.mp4 --box x0,y0,x1,y1 --from above` → place `patch.png`
inside `.mk-cam` at `left:x0;top:y0` so it zooms with the footage. Check `patch_preview.png`.
