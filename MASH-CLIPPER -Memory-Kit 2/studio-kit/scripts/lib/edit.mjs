// Video operations built on FFmpeg: ingest, cutting, reframing, concat, overlay, export.
import fs from "node:fs";
import path from "node:path";
import {
  P, die, ffmpeg, ffmpegAnalyze, probe, outPath, slugify, writeJSON, readJSON, parseTime, fmtTime,
  WORK_V, WORK_A,
} from "./core.mjs";

// ---------------------------------------------------------------- ingest
// Normalise any source (Tella export, phone clip, screen recording) into the
// working format: constant frame rate, H.264 yuv420p, AAC 48k stereo.
// Tella/screen recordings are often VFR, which breaks frame-accurate cutting.
export function ingest(input, { name, fps = 30, out } = {}) {
  const src = probe(input);
  if (!src.hasVideo) die(`No video stream in ${input}`);
  const slug = slugify(name || path.basename(input));
  const dir = path.join(P.projects, slug);
  fs.mkdirSync(path.join(dir, "work"), { recursive: true });
  fs.mkdirSync(path.join(dir, "exports"), { recursive: true });
  const dest = out ? path.resolve(out) : path.join(dir, "source.mp4");
  // Keep even dimensions; cap at 4K.
  const vf = `fps=${fps},scale='min(3840,iw)':-2:flags=lanczos,setsar=1,format=yuv420p`;
  // Silent sources get a silent stereo track so every later step can assume audio.
  const args = src.hasAudio
    ? ["-i", input, "-map", "0:v:0", "-map", "0:a:0", "-vf", vf, ...WORK_V, ...WORK_A,
       "-af", "aresample=async=1:first_pts=0", "-movflags", "+faststart", dest]
    : ["-i", input, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v:0", "-map", "1:a:0", "-shortest",
       "-vf", vf, ...WORK_V, ...WORK_A, "-movflags", "+faststart", dest];
  ffmpeg(args);
  const info = probe(dest);
  const projFile = path.join(dir, "project.json");
  const proj = readJSON(projFile, {});
  writeJSON(projFile, {
    ...proj,
    name: slug,
    created: proj.created || new Date().toISOString(),
    original: path.resolve(input),
    source: path.relative(dir, dest),
    sourceInfo: { width: info.width, height: info.height, fps: info.fps, duration: info.duration },
  });
  console.log(`\n✔ Ingested → ${dest}\n  ${info.width}x${info.height} @ ${info.fps}fps, ${fmtTime(info.duration)}`);
  return dest;
}

// ---------------------------------------------------------------- silence detection
export function detectSilence(input, { db = -35, min = 0.5 } = {}) {
  const log = ffmpegAnalyze(["-i", input, "-vn", "-af", `silencedetect=noise=${db}dB:d=${min}`, "-f", "null", "-"]);
  const sil = [];
  let start = null;
  for (const line of log.split("\n")) {
    const s = line.match(/silence_start: (-?[\d.]+)/);
    const e = line.match(/silence_end: ([\d.]+)/);
    if (s) start = Math.max(0, Number(s[1]));
    if (e && start !== null) {
      sil.push([start, Number(e[1])]);
      start = null;
    }
  }
  if (start !== null) sil.push([start, Infinity]);
  return sil;
}

// Invert silences into "keep" ranges, padding speech so words aren't clipped.
export function silencesToKeep(silences, duration, { pad = 0.12, minKeep = 0.25 } = {}) {
  const keep = [];
  let cursor = 0;
  for (const [s, e] of silences) {
    const end = Math.min(duration, s + pad);
    if (end - cursor >= minKeep) keep.push([cursor, end]);
    cursor = Math.max(cursor, Math.min(duration, e) - pad);
  }
  if (duration - cursor >= minKeep) keep.push([cursor, duration]);
  return mergeRanges(keep);
}

function mergeRanges(ranges, gap = 0.04) {
  const sorted = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1] + gap) last[1] = Math.max(last[1], r[1]);
    else out.push([...r]);
  }
  return out;
}

// "0-5.2, 7:01-7:30.5" → [[0,5.2],[421,450.5]]
export function parseRanges(spec) {
  if (Array.isArray(spec)) return spec.map((r) => (Array.isArray(r) ? r.map(parseTime) : [parseTime(r.start), parseTime(r.end)]));
  if (typeof spec === "string" && fs.existsSync(spec)) {
    const j = readJSON(spec);
    return parseRanges(j.keep || j.ranges || j);
  }
  return String(spec)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((r) => {
      const m = r.match(/^(.+?)\s*(?:->|-(?=\d))\s*(.+)$/);
      if (!m) die(`Bad range "${r}" (use start-end, e.g. 1:02.5-1:10)`);
      return [parseTime(m[1]), m[2] === "end" ? Infinity : parseTime(m[2])];
    });
}

export function invertRanges(remove, duration) {
  const keep = [];
  let cursor = 0;
  for (const [a, b] of mergeRanges(remove)) {
    if (a > cursor) keep.push([cursor, a]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < duration) keep.push([cursor, duration]);
  return keep;
}

// Render only the keep ranges, joined. Boundaries snap to the frame grid so
// audio and video stay in sync across hundreds of cuts; each join gets a tiny
// audio fade to kill clicks.
export function renderKeep(input, keep, out, { fade = 0.012 } = {}) {
  const info = probe(input);
  const fps = info.fps || 30;
  const snap = (t) => Math.round(t * fps) / fps;
  const ranges = keep
    .map(([a, b]) => [snap(Math.max(0, a)), snap(Math.min(info.duration, b))])
    .filter(([a, b]) => b - a >= 1 / fps);
  if (!ranges.length) die("Nothing left to keep after cutting.");
  const lines = [];
  ranges.forEach(([a, b], i) => {
    if (info.hasVideo) lines.push(`[0:v]trim=start=${a}:end=${b},setpts=PTS-STARTPTS[v${i}];`);
    if (info.hasAudio) {
      const d = b - a, f = Math.min(fade, d / 4);
      lines.push(
        `[0:a]atrim=start=${a}:end=${b},asetpts=PTS-STARTPTS,afade=t=in:d=${f},afade=t=out:st=${(d - f).toFixed(4)}:d=${f}[a${i}];`,
      );
    }
  });
  const pads = ranges.map((_, i) => `${info.hasVideo ? `[v${i}]` : ""}${info.hasAudio ? `[a${i}]` : ""}`).join("");
  lines.push(`${pads}concat=n=${ranges.length}:v=${info.hasVideo ? 1 : 0}:a=${info.hasAudio ? 1 : 0}${info.hasVideo ? "[v]" : ""}${info.hasAudio ? "[a]" : ""}`);
  const script = out + ".filter.txt";
  fs.writeFileSync(script, lines.join("\n"));
  const maps = [...(info.hasVideo ? ["-map", "[v]"] : []), ...(info.hasAudio ? ["-map", "[a]"] : [])];
  try {
    ffmpeg(["-i", input, "-filter_complex_script", script, ...maps, ...WORK_V, ...WORK_A, "-movflags", "+faststart", out]);
  } finally {
    fs.rmSync(script, { force: true });
  }
  const kept = ranges.reduce((s, [a, b]) => s + b - a, 0);
  return { ranges, kept, removed: info.duration - kept, original: info.duration };
}

export function silenceCut(input, { db = -35, min = 0.5, pad = 0.12, out, dryRun = false } = {}) {
  const info = probe(input);
  if (!info.hasAudio) die("Silence cut needs an audio track.");
  const silences = detectSilence(input, { db, min });
  const keep = silencesToKeep(silences, info.duration, { pad });
  const dest = outPath(input, "tight", "mp4", out);
  const report = { db, min, pad, silences: silences.length, keep };
  if (dryRun) {
    console.log(JSON.stringify(report, null, 2));
    return null;
  }
  const r = renderKeep(input, keep, dest);
  writeJSON(dest.replace(/\.mp4$/, ".cuts.json"), { ...report, ...r });
  console.log(`\n✔ Silence cut → ${dest}\n  ${silences.length} gaps removed, ${fmtTime(r.original)} → ${fmtTime(r.kept)} (−${r.removed.toFixed(1)}s)`);
  return dest;
}

export function cut(input, { keep, remove, out } = {}) {
  const info = probe(input);
  if (!keep && !remove) die("cut needs --keep or --remove ranges");
  let ranges = keep ? parseRanges(keep) : invertRanges(parseRanges(remove), info.duration);
  ranges = ranges.map(([a, b]) => [a, Math.min(b, info.duration)]);
  const dest = outPath(input, "cut", "mp4", out);
  const r = renderKeep(input, ranges, dest);
  console.log(`\n✔ Cut → ${dest}\n  ${r.ranges.length} segments, ${fmtTime(r.original)} → ${fmtTime(r.kept)}`);
  return dest;
}

// ---------------------------------------------------------------- reframe
export const ASPECTS = {
  "9:16": [1080, 1920],
  "4:5": [1080, 1350],
  "1:1": [1080, 1080],
  "16:9": [1920, 1080],
  "4:3": [1440, 1080],
};
export function dimsFor(to) {
  if (ASPECTS[to]) return ASPECTS[to];
  const m = String(to).match(/^(\d+)x(\d+)$/);
  if (m) return [Number(m[1]), Number(m[2])];
  die(`Unknown aspect "${to}". Use ${Object.keys(ASPECTS).join(", ")} or WxH.`);
}

// mode: crop (fill frame, crop sides; --focus 0..1 picks horizontal position),
//       blur (fit + blurred fill behind — good for screen recordings),
//       fit  (letterbox on --bg color)
export function reframe(input, { to = "9:16", mode = "crop", focus = 0.5, focusY = 0.5, zoom = 1, bg = "black", out } = {}) {
  const [W, H] = dimsFor(to);
  const dest = outPath(input, `${to.replace(":", "x")}`, "mp4", out);
  let fc;
  if (mode === "crop") {
    const z = Number(zoom);
    fc =
      `[0:v]scale=w=${W * z}:h=${H * z}:force_original_aspect_ratio=increase:flags=lanczos,` +
      `crop=${W}:${H}:(iw-${W})*${focus}:(ih-${H})*${focusY},setsar=1[v]`;
  } else if (mode === "blur") {
    fc =
      `[0:v]split=2[bgsrc][fgsrc];` +
      `[bgsrc]scale=w=${Math.round(W / 4)}:h=${Math.round(H / 4)}:force_original_aspect_ratio=increase,crop=${Math.round(W / 4)}:${Math.round(H / 4)},gblur=sigma=12,eq=brightness=-0.12:saturation=1.2,scale=${W}:${H}[bg];` +
      `[fgsrc]scale=w=${W}:h=${H}:force_original_aspect_ratio=decrease:flags=lanczos,scale=w='iw*${zoom}':h=-2[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2,setsar=1[v]`;
  } else if (mode === "fit") {
    fc = `[0:v]scale=w=${W}:h=${H}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=${bg},setsar=1[v]`;
  } else die(`Unknown reframe mode "${mode}" (crop | blur | fit)`);
  const info = probe(input);
  ffmpeg([
    "-i", input, "-filter_complex", fc, "-map", "[v]", ...(info.hasAudio ? ["-map", "0:a", "-c:a", "copy"] : []),
    ...WORK_V, "-movflags", "+faststart", dest,
  ]);
  console.log(`\n✔ Reframed (${mode}) → ${dest}  ${W}x${H}`);
  return dest;
}

// ---------------------------------------------------------------- concat
// Joins clips of any format: each is conformed to the first clip's size/fps.
export function concat(inputs, { out, size, fps } = {}) {
  if (inputs.length < 2) die("concat needs at least 2 inputs");
  const infos = inputs.map(probe);
  const W = size ? dimsFor(size)[0] : infos[0].width;
  const H = size ? dimsFor(size)[1] : infos[0].height;
  const F = fps || Math.round(infos[0].fps || 30);
  const args = [];
  const lines = [];
  inputs.forEach((f, i) => {
    args.push("-i", f);
    lines.push(
      `[${i}:v]scale=w=${W}:h=${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=${F},setsar=1,format=yuv420p[v${i}];`,
    );
  });
  // Silent clips get generated silence so the concat stays aligned.
  infos.forEach((info, i) => {
    if (info.hasAudio) lines.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo[a${i}];`);
    else lines.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${info.duration}[a${i}];`);
  });
  lines.push(`${infos.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${infos.length}:v=1:a=1[v][a]`);
  const dest = outPath(inputs[0], "joined", "mp4", out);
  ffmpeg([...args, "-filter_complex", lines.join(""), "-map", "[v]", "-map", "[a]", ...WORK_V, ...WORK_A, "-movflags", "+faststart", dest]);
  console.log(`\n✔ Joined ${inputs.length} clips → ${dest}`);
  return dest;
}

// ---------------------------------------------------------------- overlay
// Composite graphics (transparent MOV/WebM/PNG, or opaque MP4 cutaways) onto a video.
// spec: { file, at, x?, y?, w?, until? }  — x/y in px or "center"; w scales the graphic.
export function overlay(input, items, { out } = {}) {
  if (!items.length) die("overlay needs at least one --add file@start");
  const info = probe(input);
  const args = ["-i", input];
  let chain = "[0:v]null[base0];";
  items.forEach((it, i) => {
    const gi = probe(it.file);
    const isStill = /\.(png|jpe?g|webp)$/i.test(it.file);
    if (isStill) args.push("-loop", "1", "-t", String(it.duration ?? 4));
    // Pick the decoder that keeps alpha for VP9 WebM.
    if (/\.webm$/i.test(it.file)) args.push("-c:v", "libvpx-vp9");
    args.push("-itsoffset", String(it.at), "-i", it.file);
    const dur = it.duration ?? (isStill ? 4 : gi.duration);
    const end = it.at + dur;
    const scale = it.w ? `scale=${it.w}:-2,` : gi.width !== info.width && !it.x ? `scale=${info.width}:${info.height}:force_original_aspect_ratio=decrease,` : "";
    const x = it.x === undefined || it.x === "center" ? "(W-w)/2" : it.x;
    const y = it.y === undefined || it.y === "center" ? "(H-h)/2" : it.y;
    chain += `[${i + 1}:v]${scale}format=yuva420p[g${i}];`;
    chain += `[base${i}][g${i}]overlay=x=${x}:y=${y}:eof_action=pass:enable='between(t,${it.at},${end.toFixed(3)})'[base${i + 1}];`;
  });
  chain += `[base${items.length}]format=yuv420p[v]`;
  const dest = outPath(input, "gfx", "mp4", out);
  ffmpeg([...args, "-filter_complex", chain, "-map", "[v]", ...(info.hasAudio ? ["-map", "0:a", "-c:a", "copy"] : []), ...WORK_V, "-movflags", "+faststart", dest]);
  console.log(`\n✔ Overlaid ${items.length} graphic(s) → ${dest}`);
  return dest;
}

// "file.mov@12.5" or "file.mov@1:02:x=40:y=1500:w=1000"
export function parseOverlaySpec(s) {
  const m = String(s).match(/^(.*)@([\d:.]+)(?::(.*))?$/);
  if (!m) die(`Bad --add "${s}" — use file@start[:x=..:y=..:w=..:duration=..]`);
  const it = { file: path.resolve(m[1]), at: parseTime(m[2]) };
  for (const kv of (m[3] || "").split(":").filter(Boolean)) {
    const [k, v] = kv.split("=");
    it[k] = ["x", "y"].includes(k) && isNaN(Number(v)) ? v : Number(v);
  }
  return it;
}

// ---------------------------------------------------------------- export
export const PRESETS = {
  reels:     { size: "9:16", crf: 18, maxrate: "20M", note: "Instagram Reels / TikTok / YouTube Shorts" },
  tiktok:    { size: "9:16", crf: 18, maxrate: "20M" },
  shorts:    { size: "9:16", crf: 18, maxrate: "20M" },
  feed:      { size: "4:5",  crf: 18, maxrate: "20M", note: "Meta feed ads" },
  square:    { size: "1:1",  crf: 18, maxrate: "20M" },
  youtube:   { size: "16:9", crf: 16, maxrate: "40M", note: "YouTube / VSL 1080p" },
  youtube4k: { size: "3840x2160", crf: 16, maxrate: "80M" },
  web:       { size: null,   crf: 23, maxrate: "6M", note: "Small file for review links / Wistia" },
  master:    { size: null,   prores: true, note: "ProRes 422 HQ for Premiere / After Effects" },
};

export function exportVideo(input, { preset = "reels", out, fit = "blur" } = {}) {
  const p = PRESETS[preset];
  if (!p) die(`Unknown preset "${preset}". Options: ${Object.keys(PRESETS).join(", ")}`);
  const info = probe(input);
  const vf = [];
  if (p.size) {
    const [W, H] = dimsFor(p.size);
    if (info.width !== W || info.height !== H) {
      const sameAspect = Math.abs(info.width / info.height - W / H) < 0.01;
      if (sameAspect) vf.push(`scale=${W}:${H}:flags=lanczos`);
      else {
        console.warn(`⚠ ${info.width}x${info.height} → ${W}x${H}: aspect differs, using "${fit}" reframe. Reframe deliberately for better results.`);
        const tmp = reframe(input, { to: p.size, mode: fit, out: outPath(input, `tmp-${preset}`, "mp4") });
        try {
          return exportVideo(tmp, { preset, out: out || outPath(input, preset, "mp4") });
        } finally {
          fs.rmSync(tmp, { force: true });
        }
      }
    }
  }
  const ext = p.prores ? "mov" : "mp4";
  const dest = outPath(input, preset, ext, out);
  const vcodec = p.prores
    ? ["-c:v", "prores_ks", "-profile:v", "3", "-pix_fmt", "yuv422p10le"]
    : ["-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-crf", String(p.crf), "-maxrate", p.maxrate, "-bufsize", p.maxrate.replace(/\d+/, (n) => n * 2), "-pix_fmt", "yuv420p", "-g", "60"];
  const acodec = p.prores ? ["-c:a", "pcm_s16le", "-ar", "48000"] : ["-c:a", "aac", "-b:a", "320k", "-ar", "48000"];
  ffmpeg(["-i", input, ...(vf.length ? ["-vf", vf.join(",")] : []), ...vcodec, ...(info.hasAudio ? acodec : ["-an"]), ...(p.prores ? [] : ["-movflags", "+faststart"]), dest]);
  const o = probe(dest);
  console.log(`\n✔ Exported [${preset}] → ${dest}\n  ${o.width}x${o.height}, ${fmtTime(o.duration)}, ${(o.size / 1e6).toFixed(1)} MB`);
  return dest;
}

// ---------------------------------------------------------------- stills
export function frames(input, { at = [], every, out } = {}) {
  const dir = out ? path.resolve(out) : outPath(input, "frames", "d").replace(/\.d$/, "");
  fs.mkdirSync(dir, { recursive: true });
  if (every) {
    ffmpeg(["-i", input, "-vf", `fps=1/${every},scale=480:-2`, path.join(dir, "f_%04d.jpg")]);
  } else {
    for (const t of at.map(parseTime)) {
      ffmpeg(["-ss", String(t), "-i", input, "-frames:v", "1", "-q:v", "2", path.join(dir, `t_${t.toFixed(2)}.jpg`)], { quiet: true });
    }
  }
  console.log(`✔ Frames → ${dir}`);
  return dir;
}
