#!/usr/bin/env node
// studio — video editing pipeline CLI (FFmpeg + HyperFrames + Tella exports + Epidemic Sound library)
import fs from "node:fs";
import path from "node:path";
import { ROOT, P, FFMPEG, FFPROBE, StudioError, parseArgs, list, num, probe, run, fmtTime, die } from "./lib/core.mjs";
import * as edit from "./lib/edit.mjs";
import * as audio from "./lib/audio.mjs";
import * as caps from "./lib/captions.mjs";
import * as gfx from "./lib/graphics.mjs";
import { runRecipe } from "./lib/recipe.mjs";

const HELP = `
studio — video editing pipeline

  SETUP
    doctor                              Check ffmpeg, ffprobe, HyperFrames, Chrome, transcription model
    music index [--force]               Scan library/epidemic (+ library/music, library/sfx) → library/catalog.json
    music list [--q words] [--type music|sfx]
    music fetch <signed-url> [--title "Name"] [--type music|sfx]
                                        Save an Epidemic Sound connector download into the library + re-index

  PER-STEP TOOLS (each writes <input>.<step>.mp4 next to the input unless -o is given)
    probe <file>                        Duration, size, fps, audio info, loudness
    ingest <file> [--name slug]         Normalise a Tella export / any clip → projects/<slug>/source.mp4
    transcribe <video> [--force]        Word-level transcript (.transcript.json + readable .transcript.txt)
    transcript <video>                  Print the readable transcript (sentences, times, word ids)
    silence <video> [--db -35] [--min 0.5] [--pad 0.12] [--dry-run]
                                        Remove dead air (jump cuts)
    cut <video> --keep "0-12.5,14-30" | --remove "1:02-1:10" | --remove-words "w12-w30,w88"
    reframe <video> --to 9:16|4:5|1:1|16:9 [--mode crop|blur|fit] [--focus 0..1] [--zoom 1.1]
    captions <video> [--style bold|soft|clean|hormozi] [--pos 0.7] [--max-words 3] [--no-burn]
    graphic <template> [--brand default] [--size 9:16] [--duration 4] [--var k=v ...] [--vars json]
                       [--transparent] [--format mp4|mov|webm] [--preview] [--check]
    graphics list                       Templates + their variables
    overlay <video> --add file.mov@3.5[:x=..:y=..:w=..] [--add ...]
    concat <a> <b> [...] [--size 9:16]
    mix <video> [--music "query or file"] [--bed -11] [--no-duck] [--music-start 12]
                [--sfx "whoosh@0.4[:-3]" ...] [--lufs -14] [--mute-voice]
    export <video> --preset reels|feed|square|youtube|youtube4k|web|master [--fit blur|crop|fit]
    frames <video> --at 1.5 --at 10 | --every 5      Grab stills to check an edit

  WHOLE EDITS
    build <recipe.json> [--from N] [--fresh]          Run a recipe (see recipes/*.example.json)
`;

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const a = parseArgs(rest);
  const [first] = a._;
  switch (cmd) {
    case undefined:
    case "help":
    case "--help":
      console.log(HELP);
      break;

    case "doctor": {
      const ok = (b, m) => console.log(`${b ? "✓" : "✗"} ${m}`);
      ok(fs.existsSync(FFMPEG) || FFMPEG === "ffmpeg", `ffmpeg  ${FFMPEG}`);
      ok(fs.existsSync(FFPROBE) || FFPROBE === "ffprobe", `ffprobe ${FFPROBE}`);
      ok(fs.existsSync(path.join(ROOT, "node_modules/.bin/hyperframes")), "hyperframes CLI (node_modules)");
      ok(fs.existsSync(P.epidemic), `Epidemic Sound folder ${P.epidemic} → ${fs.existsSync(P.epidemic) ? fs.realpathSync(P.epidemic) : "missing"}`);
      ok(fs.existsSync(P.catalog), "music catalog (run: studio music index)");
      run(path.join(ROOT, "node_modules/.bin/hyperframes"), ["doctor"], { cwd: ROOT });
      break;
    }

    case "music": {
      if (first === "index") audio.indexLibrary({ force: !!a.force });
      else if (first === "fetch") await audio.fetchTrack(a._[1], { title: a.title, type: a.type || "music" });
      else if (first === "list" || first === "search") {
        const hits = audio.search(a.q || a._.slice(1).join(" "), { type: a.type, limit: num(a.limit, 50) });
        for (const h of hits) console.log(`[${h.type.padEnd(5)}] ${fmtTime(h.duration).padStart(8)}  ${String(h.lufs ?? "").padStart(6)} LUFS  ${h.title}`);
        if (!hits.length) console.log("No matches.");
      } else die("music index | music list [--q words] [--type music|sfx]");
      break;
    }

    case "probe": {
      const info = probe(first);
      if (info.hasAudio) Object.assign(info, { loudness: audio.loudness(first) });
      console.log(JSON.stringify(info, null, 2));
      break;
    }
    case "ingest":
      edit.ingest(first, { name: a.name, fps: num(a.fps, 30), out: a.out });
      break;
    case "transcribe":
      caps.transcribe(first, { force: !!a.force, language: a.language });
      console.log(caps.printTranscript(first));
      break;
    case "transcript":
      console.log(caps.printTranscript(first));
      break;
    case "silence":
      edit.silenceCut(first, { db: num(a.db, -35), min: num(a.min, 0.5), pad: num(a.pad, 0.12), out: a.out, dryRun: !!a["dry-run"] });
      break;
    case "cut":
      if (a["remove-words"]) edit.cut(first, { remove: caps.wordIdsToRanges(first, a["remove-words"]), out: a.out });
      else edit.cut(first, { keep: a.keep, remove: a.remove, out: a.out });
      break;
    case "reframe":
      edit.reframe(first, { to: a.to || "9:16", mode: a.mode || "crop", focus: num(a.focus, 0.5), focusY: num(a["focus-y"], 0.5), zoom: num(a.zoom, 1), bg: a.bg || "black", out: a.out });
      break;
    case "captions":
      caps.captions(first, { style: a.style || "bold", pos: a.pos, maxWords: a["max-words"], burn: a.burn !== false, highlight: a.highlight !== false, transcript: a.transcript, out: a.out });
      break;

    case "graphics":
      if (first !== "list") die("graphics list");
      for (const t of gfx.listTemplates()) {
        console.log(`\n${t.name}  (${t.duration}s${t.transparent ? ", transparent" : ""})\n  ${t.description}`);
        for (const v of t.variables || []) console.log(`    --var ${v.id}=…  ${v.label}  [default: ${JSON.stringify(v.default)}]`);
      }
      console.log(`\nBrands: ${Object.keys(gfx.brands()).join(", ")}   Sizes: 9:16 4:5 1:1 16:9 or WxH`);
      break;
    case "graphic": {
      const opts = {
        brand: a.brand || "default",
        vars: gfx.collectVars(a),
        size: a.size || "9:16",
        duration: a.duration !== undefined ? num(a.duration) : undefined,
        transparent: a.transparent === undefined ? undefined : a.transparent !== false && a.transparent !== "false",
        format: a.format,
        out: a.out,
      };
      if (a.preview) console.log(`Preview project: ${gfx.previewGraphic(first, opts)}`);
      else if (a.check) gfx.checkGraphic(gfx.buildGraphic(first, opts).dir);
      else gfx.renderGraphic(first, opts);
      break;
    }

    case "overlay":
      edit.overlay(first, list(a.add).map(edit.parseOverlaySpec), { out: a.out });
      break;
    case "concat":
      edit.concat(a._, { out: a.out, size: a.size });
      break;
    case "mix":
      audio.mix(first, {
        music: a.music,
        bed: a.bed !== undefined ? num(a.bed) : undefined,
        duck: a.duck !== false,
        musicStart: num(a["music-start"], 0),
        sfx: list(a.sfx),
        lufs: num(a.lufs, -14),
        voiceDb: num(a["voice-db"], 0),
        muteVoice: !!a["mute-voice"],
        out: a.out,
      });
      break;
    case "export":
      for (const p of list(a.preset).length ? list(a.preset) : ["reels"]) edit.exportVideo(first, { preset: p, out: a.out, fit: a.fit || "blur" });
      break;
    case "frames":
      edit.frames(first, { at: list(a.at), every: a.every && Number(a.every), out: a.out });
      break;

    case "build":
      runRecipe(first, { from: a.from, only: a.only, fresh: !!a.fresh });
      break;

    default:
      die(`Unknown command "${cmd}". Run: studio help`);
  }
}

main().catch((e) => {
  if (e instanceof StudioError) {
    console.error(`\n✗ ${e.message}`);
    process.exit(1);
  }
  throw e;
});
