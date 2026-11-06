---
name: mash-playbook
description: LOAD FIRST for any video task (clip a YouTube link or file, make reels/shorts, edit a podcast, add captions/motion graphics, render 720p/4K, make a reel cover, "MASH Clipper", "MESH Clipper", "Mash kit"). It is the complete working memory of how this user wants videos made: workflow, approval gates, clip-finding rules (interviews = question + answer), editing rules (nothing on faces, exact-word captions, smooth transitions, original audio), styles, tech cookbook, every past mistake, and a prompt glossary. Read all references before doing the work so the user never has to repeat a correction.
---

# MASH Playbook: how to edit the way this user wants

**Read these in order, every time, before you start** (they are short and they are the user's corrections turned into rules):
1. `references/01_HOW_THE_USER_WORKS.md`: working style, gates, tone, credits
2. `references/02_MASTER_WORKFLOW.md`: link → clips → style → storyboard → 720p → 4K → cover
3. `references/03_CLIP_FINDING_RULES.md`: story clips, **question + answer for interviews**, speaker framing, Hindi, trimming
4. `references/04_EDITING_RULES.md`: faces, framing, captions, motion, transitions, visuals, audio
5. `references/05_STYLES_AND_PRESETS.md`: 15 styles + Documentary / Podcast-card / Boxed recipes, Mash Pro effects
6. `references/06_TECH_COOKBOOK.md`: commands, versions, HyperFrames patterns, bug → fix
7. `references/07_MISTAKES_NEVER_REPEAT.md`: 35 corrections: check it before every build
8. `references/08_PROMPT_LIBRARY_AND_GLOSSARY.md`: dictation glossary, phrase → action
9. `references/09_DELIVERY_QA_CHECKLISTS.md`: gates, delivery, covers, QA
(`references/10_START_PROMPT.md` is the paste-in prompt for a fresh session.)

## If you read nothing else, these 20 rules decide whether the user is happy
1. Work in gates: raw clips → style → PNG storyboard → 720p → 4K. Stop and show real files at each; never render ahead of approval.
2. A clip is a story (hook → body → payoff → ending). Interview clips contain the question AND the answer, both people visible.
3. Cut both versions: 4K vertical framed on whoever speaks (split at camera cuts) and the original horizontal.
4. Trim pauses, stammers, repeated words; verify every clip by re-transcribing; end on a complete sentence.
5. Captions = the speaker's exact words, starting on the first spoken word, never early, never repeated, never over a graphic that shows the same words.
6. Open straight on the spoken line: no title cards, kickers or big headlines first.
7. Nothing ever covers a face. Captions sit on the chest under the chin; in the middle band on B-roll.
8. Mix scene types (full-frame, print/card, kinetic type, list notes, B-roll). One look for 60 s = "one-sided".
9. Transitions: old scene fades out, then new fades in. Never overlap, never slide over footage.
10. No glitch: gate graphics to their scene, hide everything at t=0, no 3D tilt on image layers, one zoom system, no blur on running text.
11. Highlights draw after the line has appeared, on the key word.
12. Original audio untouched. No music/SFX unless asked. Master = copied audio stream.
13. 4K final from 4K sources, closed GOP, Premiere-safe, saved to `~/Downloads/<title> - Clips/`, revealed in Finder, with a phone-safe loud 720p sent.
14. Boxed speakers use the original horizontal footage in a 16:9 box, never a tight crop of the vertical.
15. Phone/UI scenes: speaker box on top, big phone below bleeding off the bottom; keep the content in the safe zone.
16. Safe zone for text/graphics (1080x1920): x 64-1016, y 250-1500.
17. Do routine steps without asking. Ask only for money/credits, deletions, publishing, or a real creative choice (one short question).
18. Never spend paid generation credits without a cost estimate and a yes; Unlimited image mode only; "no text, no logos, no brand marks" in prompts.
19. Check every build 2-3 times (every beat + every transition midpoint) before you say it is ready; say what you did not verify.
20. Always say where the final file is, and give the ETA when a render starts.

Use the `mash-clipper` skill to run the clipping flow, and `mash-pro-editor`, `motion-fx`, `hyperframes` for the edit itself.
