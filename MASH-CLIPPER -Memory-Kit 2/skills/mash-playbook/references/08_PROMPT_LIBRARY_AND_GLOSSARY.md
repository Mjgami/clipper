# 08 · How the user phrases things, and what to do

## Dictation glossary (voice-to-text garbles names: treat odd words as dictation errors before asking)
- "MASH Clipper", "MESH Clipper", "Mash/Mesh AI kit", "Moheshaya kit", "Mash Pro", "Mesh Kit" → the Mash Pro editing kit / `mash-clipper` skill.
- "Hexfield", "Hiexfield", "Higgsfield unlimited" → Higgsfield (AI image/video); "unlimited" = Seedream 4.5 with the Unlimited switch on.
- "SeaAI / ChatGPT / Higgsfield for images" → generate B-roll with Higgsfield Seedream (Unlimited) or another free image generator; ask before using anything paid.
- "claude rc" / "Claude RC" → turn on Remote Control for this session.
- "kinetic text", "Mash text animator" → Mash Pro `MP.text` styles.
- A person's name that looks like an ordinary word is probably a dictation error: resolve from context (names in the video/captions).
- "tape effect frame" = the taped photo print; "H" transitions = horizontal/scene transitions; "storyboard" = full-screen PNG frames.

## Phrases → actions
| They say | Do this |
|---|---|
| "take clips from this video" / paste a link | Run the mash-clipper flow from step 1; ask how many clips (1-5) |
| "use the host with glasses as main" | Identify the person on screen first; ask one short question if the name is unclear |
| "I want the question and the answer" / "show both" | Q&A clips: question (trimmed) + the guest's full answer; both visible |
| "make it viral" | Strong hook in 3 s, complete payoff, tight pauses, mixed scene types, captions on key words |
| "give me the 720p" | Render `-q looks`, phone-safe + loud copy, send to the phone |
| "give me the 4K" | 4K sources, `portrait-4k -q delivery`, original audio, Premiere-safe, Downloads folder, Finder reveal, phone copy |
| "storyboard" / "give me PNG" | Full-screen 1080x1920 frames from the real build, named `NN_<time>s.png`, plus contact sheet |
| "fix the glitch" / "analyze 2-3 times" | Snapshot all transitions (start/mid/end) and every beat; fix; re-check; then render |
| "text is early/overlapping/repeating" | Re-gate captions to the spoken word; sequential scenes; remove duplicate words |
| "trim the gaps / repeated words" | silencedetect + re-transcribe; cut pauses > 0.35 s, stammers, repeats; re-time via source map |
| "make a mix of styles" | Alternate full-frame, print/card, kinetic type, list notes, B-roll; do not hold one look for the whole clip |
| "zoom in/out the phone/box" | Re-frame: bigger phone bleeding off the bottom; box shows head + chest with the original horizontal footage |
| "reel cover" | 1080x1920 PNG next to the 4K; interview = side-by-side facing each other |
| "stop everything, give me the memory" | Stop background tasks, package skills + playbook in one zip (this kit) |
| "use Sonnet / Opus" | The model is chosen in the app's model menu; tell them if it must be switched there |

## Examples of the user's real prompts (paraphrased)
- "Install this repo; when I say use MASH Clipper, auto-correct MASH to MESH and analyse."
- "Take out 2-3 clips where the host speaks more and sounds authoritative; 100% high-quality cutouts; merge the middle parts if needed; give me the options that will go viral."
- "Make sure the captions say exactly what he is saying, not what you are doing."
- "Whenever there is text in the graphic, do not show the captions. Show captions when needed. Don't repeat the same words."
- "Start with the full vertical frame; when I change the shape, use the horizontal video so it fits inside shapes."
- "Make everything pop with very high quality graphics and animations; no glitch; analyse 2-3 times."
- "Don't do any sound effects on his original voice. Keep the original voice as it is."
- "Use B-roll and other tags, make a mix of everything; use the whole branding kit according to the framing."
- "Give me a proper side-by-side conversation reel cover; they should face each other."
- "Package all the memory, presets and skills in one zip so another Claude can do the same without me guiding every step; no one's branding in it."
