# Studio kit: operating manual for Claude (brand-neutral)

A small Node CLI (`studio`) on top of FFmpeg + HyperFrames for cuts, reframes, captions, graphics and audio, driven by JSON recipes. The Mash Pro / HyperFrames skills are the main edit engine; use this CLI for batch/recipe work.

Setup: `npm install` in this folder, then `node scripts/studio.mjs doctor`. Needs ffmpeg + ffprobe in PATH (or edit `scripts/lib/core.mjs`). Transcription: `npx hyperframes models install parakeet`.

Standard flow: **storyboard first** (show real frames, wait for OK) → `studio probe` → `studio transcribe` → write `recipes/<slug>.json` → `studio build recipes/<slug>.json` → `studio frames <final> --at ...` and LOOK before reporting.

Recipe ops (each step feeds the next): `silence`, `cut`, `reframe`, `captions` (styles bold/soft/clean/hormozi), `graphics`, `append`/`prepend`, `mix`, `export`. Order: cuts → reframe → captions → graphics → append/prepend → mix → export. Brand tokens live in `config/brands.json` (colours, fonts, caption style): edit them per project. Graphic templates are in `graphics/templates` (`*word*` in text = accent colour).

Always follow `/mash-playbook` (the user's working memory): exact-word captions, nothing on faces, smooth transitions, original audio untouched, no music/SFX unless asked, closed-GOP finals, phone-safe previews, never spend paid credits without approval.
