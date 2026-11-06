// Recipe runner: an edit described as JSON steps, each feeding the next.
// Every step's output is cached by a hash of (step config + input file), so
// re-running after tweaking step N only re-renders from step N onward.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT, P, die, probe, readJSON, writeJSON, slugify, fmtTime } from "./core.mjs";
import * as edit from "./edit.mjs";
import * as audio from "./audio.mjs";
import * as caps from "./captions.mjs";
import * as gfx from "./graphics.mjs";

export function runRecipe(recipeFile, { from, only, fresh = false } = {}) {
  const recipePath = path.resolve(recipeFile);
  const r = readJSON(recipePath);
  const base = path.dirname(recipePath);
  const resolve = (p) => {
    if (!p || path.isAbsolute(p)) return p;
    const a = path.resolve(base, p);
    return fs.existsSync(a) ? a : path.resolve(ROOT, p);
  };
  const name = slugify(r.name || path.basename(recipePath, ".json"));
  const brand = r.brand || "default";
  const projDir = path.join(P.projects, name);
  const work = path.join(projDir, "work");
  fs.mkdirSync(work, { recursive: true });
  fs.mkdirSync(path.join(projDir, "exports"), { recursive: true });

  const input = resolve(r.input);
  if (!input || !fs.existsSync(input)) die(`Recipe input not found: ${r.input}`);

  // Step 0: ingest (normalise to CFR H.264/AAC) unless told not to.
  let cur = input;
  if (r.ingest !== false) {
    const src = path.join(projDir, "source.mp4");
    const stale = !fs.existsSync(src) || fs.statSync(src).mtimeMs < fs.statSync(input).mtimeMs || fresh;
    if (stale) edit.ingest(input, { name, fps: r.fps || 30, out: src });
    else console.log(`• ingest (cached) ${path.relative(ROOT, src)}`);
    cur = src;
  }

  const outputs = [];
  r.steps.forEach((step, i) => {
    const n = String(i + 1).padStart(2, "0");
    const label = `${n}-${step.op}`;
    if (step.skip) return console.log(`• ${label} skipped`);
    const st = fs.statSync(cur);
    const key = crypto.createHash("sha1").update(JSON.stringify({ step, brand, cur, m: st.mtimeMs, s: st.size })).digest("hex").slice(0, 8);
    const out = path.join(work, `${label}-${key}.mp4`);
    const forced = fresh || (from && i + 1 >= Number(from)) || (only && i + 1 === Number(only));
    if (step.op === "export") {
      outputs.push(...doExport(cur, step, { name, projDir, resolve }));
      return;
    }
    if (fs.existsSync(out) && !forced) {
      console.log(`• ${label} (cached)`);
      cur = out;
      return;
    }
    console.log(`\n━━ ${label} ━━`);
    // Write to a temp name and rename on success, so a failed step never looks cached.
    const tmp = out.replace(/\.mp4$/, ".partial.mp4");
    fs.renameSync(doStep(cur, step, { out: tmp, brand, resolve, work, label }), out);
    cur = out;
  });

  const final = path.join(projDir, `${name}.final.mp4`);
  if (path.resolve(cur) !== path.resolve(final)) fs.copyFileSync(cur, final);
  const info = probe(final);
  writeJSON(path.join(projDir, "last-run.json"), { recipe: recipePath, finishedAt: new Date().toISOString(), final, exports: outputs });
  console.log(`\n✅ ${name}: ${final}\n   ${info.width}x${info.height}, ${fmtTime(info.duration)}${outputs.length ? `\n   exports:\n   - ${outputs.join("\n   - ")}` : ""}`);
  return final;
}

function doStep(cur, step, { out, brand, resolve }) {
  const s = { ...step };
  switch (s.op) {
    case "silence":
      return edit.silenceCut(cur, { db: s.db, min: s.min, pad: s.pad, out });
    case "cut": {
      if (s.removeWords) return edit.cut(cur, { remove: caps.wordIdsToRanges(cur, s.removeWords), out });
      return edit.cut(cur, { keep: s.keep, remove: s.remove, out });
    }
    case "reframe":
      return edit.reframe(cur, { ...s, out });
    case "captions":
      return caps.captions(cur, { style: s.style || gfx.brands()[brand]?.captionStyle || "clean", pos: s.pos, maxWords: s.maxWords, highlight: s.highlight !== false, transcript: s.transcript && resolve(s.transcript), out });
    case "graphics":
    case "overlay": {
      const info = probe(cur);
      const items = (s.items || []).map((it, j) => {
        if (it.file) return { ...it, file: resolve(it.file) };
        const file = gfx.renderGraphic(it.template, {
          brand: it.brand || brand,
          vars: resolveFileVars(it.vars || {}, resolve),
          size: `${info.width}x${info.height}`,
          duration: it.duration,
          transparent: it.transparent ?? true,
          format: "mov",
          out: out.replace(/\.mp4$/, `.g${j}.mov`),
        });
        return { file, at: it.at ?? 0, x: it.x, y: it.y, w: it.w };
      });
      return edit.overlay(cur, items, { out });
    }
    case "append":
    case "prepend": {
      const info = probe(cur);
      let clip;
      if (s.file) clip = resolve(s.file);
      else {
        clip = gfx.renderGraphic(s.template, {
          brand: s.brand || brand,
          vars: resolveFileVars(s.vars || {}, resolve),
          size: `${info.width}x${info.height}`,
          duration: s.duration,
          transparent: false,
          format: "mp4",
          out: out.replace(/\.mp4$/, ".card.mp4"),
        });
      }
      return edit.concat(s.op === "append" ? [cur, clip] : [clip, cur], { out });
    }
    case "mix":
    {
      // music/sfx may be file paths or library search terms ("Fate's Symphony", "whoosh").
      const fileOrQuery = (ref) => (ref && fs.existsSync(resolve(ref)) ? resolve(ref) : ref);
      const sfx = (s.sfx || []).map(audio.parseSfxSpec).map((x) => ({ ...x, ref: fileOrQuery(x.ref) }));
      return audio.mix(cur, { ...s, music: fileOrQuery(s.music), sfx, out });
    }
    default:
      die(`Unknown recipe op "${s.op}". Ops: silence, cut, reframe, captions, graphics, append, prepend, mix, export`);
  }
}

function resolveFileVars(vars, resolve) {
  const out = {};
  for (const [k, v] of Object.entries(vars)) {
    const r = typeof v === "string" && /\.(png|jpe?g|webp|gif|svg)$/i.test(v) ? resolve(v) : v;
    out[k] = r;
  }
  return out;
}

function doExport(cur, step, { name, projDir }) {
  const presets = [].concat(step.presets || step.preset || "reels");
  return presets.map((p) =>
    edit.exportVideo(cur, { preset: p, fit: step.fit || "blur", out: path.join(projDir, "exports", `${name}-${p}.${p === "master" ? "mov" : "mp4"}`) }),
  );
}
