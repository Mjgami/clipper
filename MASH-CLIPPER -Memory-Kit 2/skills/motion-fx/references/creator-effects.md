# CreatorFX catalog (creator YouTube effects)

`assets/creatorfx.js` + `assets/creatorfx.css`, scaffolded into every project by `new_project.py`.
`const CF = CreatorFX(tl, { root: "#root", fps: 30 })`. Working demo of every effect:
`examples/creator-explainer_16x9.html`.

These came out of a real 4-part creator video (a Hinglish talking-head channel launch). Each one replaces a
"text card" with something that looks designed or real.

| Helper | Effect | Use it when the speaker says... |
|---|---|---|
| `MK.zoom(cam, t, {to, origin, inDur, hold, outDur})` | eased push in, hold, ease out (in motionkit.js) | an impact line. 4-6 per minute, never on every line |
| `CF.decode(sel, t)` | letters scramble through glyphs, then lock left to right | a reveal word ("AI EDITED", a product name) |
| `CF.shimmer(sel, t)` + `.cf-gold` / `.cf-silver` | metallic sweep across text | "golden", "premium". Gold ONLY when the words say gold |
| `CF.folder({...})` + `CF.openFolder(id, t)` | Apple-style folder that opens and fans out labelled papers | the thing the video sells (kit, course, pack); reuse it as a recurring hero object |
| `CF.pipIn/pipOut({wrap, t, ring, stage})` | speaker shrinks to a corner, showcase plays behind, then expands | "you can make videos like these", any showcase |
| `CF.camBox/camFull({wrap, t, box, ring})` | speaker eases into a tall rounded box on one side, back to full | screen-recording or review sections (light studio layout) |
| `CF.lightStage(sel, colors, dur, base?)` | soft blurred blobs + dot grid; light by default, dark with `base` | background behind PiP, camBox and graphics |
| `CF.post(parent, {...})` + `CF.rise` | X / Threads-style post card | "everyone is saying..." with REAL posts the user picked |
| `CF.chat(parent, {...}, t)` | WhatsApp-style chat with typing dots | a client conversation, a DM, "he messaged me" |
| `CF.progress(sel, t, d)` | glass bar with fill and knob (`.cf-bar`, `.cf-on-light` on light stages) | "from start to end", progress, steps |
| `CF.rise(sel, t)` / `CF.fall(sel, t)` | soft entrance / blur-up exit | any card |

## Markup notes
- Decoder: `<div class="mk-big cf-dec" id="hero">AI EDITED</div>`. Re-run `CF.decode` later to decode it again.
- PiP / camBox need the camera wrapped: `<div id="camWrap"><div class="mk-cam" id="cam"><video ...></video></div></div>`.
  Animate zooms on `#cam`, PiP/box on `#camWrap`, so they never fight.
- MK.lead needs an EMPTY container with class `mk-lead`; it adds the word spans itself.
- Progress bar: `.cf-bar > .cf-track + .cf-fill + .cf-rail > .cf-head`, plus `.cf-lab` labels.

## Real UI beats (build them, don't fake them with text)
The edits that landed best swapped a text card for real-looking software. Recreate the UI in HTML/CSS with the real
layout, real labels and the real error text, or use the user's own screenshot (crop out private info):
- macOS menu-bar clock for "it's 3 AM" (only over a night shot or a screen, never over daylight footage)
- a render queue / export window with the real error dialog for "the render failed"
- an editing timeline with a razor cut, a graph editor curve, a voice-driven waveform for "editing / motion / sound"
- a chat app for client feedback, the creator's own Instagram profile screenshot for social proof
- a Claude Code window with typed prompts and attachments for "I just typed this" (seek-safe: render every message
  list state from the timeline time, never by appending DOM during playback)

Always ask: does this picture match the exact words being said? If nothing real fits, stay on the speaker with one
key word instead.
