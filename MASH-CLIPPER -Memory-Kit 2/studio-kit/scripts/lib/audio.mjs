// Epidemic Sound library catalog + audio mixing (music bed, ducking, SFX, loudness).
import fs from "node:fs";
import path from "node:path";
import { P, die, ffmpeg, ffmpegAnalyze, probe, outPath, readJSON, writeJSON, parseTime, fmtTime } from "./core.mjs";

const AUDIO_EXT = /\.(mp3|wav|m4a|aiff?|flac|ogg)$/i;
// Extra local folders scanned alongside the Epidemic Sound download folder.
const LIBRARY_DIRS = () => [P.epidemic, path.join(P.library, "music"), path.join(P.library, "sfx")];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else if (AUDIO_EXT.test(e.name)) acc.push(full);
  }
  return acc;
}

function measureLufs(file) {
  const log = ffmpegAnalyze(["-i", file, "-vn", "-af", "ebur128=framelog=quiet", "-f", "null", "-"]);
  const m = log.match(/Integrated loudness:\s+I:\s+(-?[\d.]+) LUFS/);
  return m ? Number(m[1]) : null;
}

// Epidemic SFX names read like "Swooshes, Whoosh, Designed, Swoosh, Light" — split into tags.
function tagsFromName(name) {
  return [...new Set(name.split(/[,_-]+/).map((t) => t.trim().toLowerCase()).filter((t) => t && !/^\d+$/.test(t)))];
}

export function indexLibrary({ force = false } = {}) {
  const prev = readJSON(P.catalog, { items: [] });
  const byPath = new Map(prev.items.map((i) => [i.path, i]));
  const items = [];
  const files = LIBRARY_DIRS().flatMap((d) => walk(d));
  if (!files.length) die(`No audio found. Download tracks from Epidemic Sound into ${P.epidemic} (or library/music, library/sfx).`);
  for (const file of files) {
    const rel = path.relative(P.library, file);
    const mtime = fs.statSync(file).mtimeMs;
    const old = byPath.get(rel);
    if (old && old.mtime === mtime && !force) {
      items.push(old);
      continue;
    }
    const info = probe(file);
    const title = path.basename(file).replace(AUDIO_EXT, "");
    // An sfx/ folder wins; otherwise anything under 30s is a sound effect. (Epidemic's
    // download folder is called "Music" but mixes both, so it isn't a reliable hint.)
    const inSfxDir = /(^|\/)(sfx|sound ?effects?)(\/|$)/i.test(rel);
    // Connector downloads are filed by type, so short music edits (e.g. a 15s ad cut) stay music.
    const inMusicDir = /(^|\/)Connector\/Music\//.test(rel);
    const type = inMusicDir || (!inSfxDir && info.duration >= 30) ? "music" : "sfx";
    const item = { path: rel, title, type, duration: +info.duration.toFixed(2), lufs: measureLufs(file), tags: tagsFromName(title), mtime };
    console.log(`  + [${type}] ${title} (${fmtTime(item.duration)}, ${item.lufs} LUFS)`);
    items.push(item);
  }
  items.sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title));
  writeJSON(P.catalog, { updated: new Date().toISOString(), count: items.length, items });
  const n = (t) => items.filter((i) => i.type === t).length;
  console.log(`\n✔ Catalog → ${P.catalog}\n  ${n("music")} music tracks, ${n("sfx")} sound effects`);
  return items;
}

// Save a track from an Epidemic Sound connector download URL (signed, expires fast) into the
// library, then re-index. Files land in library/epidemic/Connector/<Music|SFX>/<title>.<ext>.
export async function fetchTrack(url, { title, type = "music" } = {}) {
  if (!/^https:\/\/[\w.-]*epidemicsound\.com\//.test(url)) die("fetch only accepts epidemicsound.com download URLs");
  const fromUrl = decodeURIComponent(url).match(/filename="?([^"&]+)"?/)?.[1];
  const ext = (fromUrl || url.split("?")[0]).match(/\.(wav|mp3)$/i)?.[1]?.toLowerCase() || "wav";
  const name = (title || fromUrl?.replace(/\.(wav|mp3)$/i, "") || "epidemic-track").replace(/[\/:*?"<>|]+/g, "-").trim();
  const dir = path.join(P.epidemic, "Connector", type === "sfx" ? "SFX" : "Music");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${name}.${ext}`);
  const res = await fetch(url);
  if (!res.ok) die(`Download failed: HTTP ${res.status} (signed URLs expire — request a fresh one)`);
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`✔ Saved ${dest} (${(fs.statSync(dest).size / 1e6).toFixed(1)} MB)`);
  indexLibrary();
  return dest;
}

export function search(query = "", { type, min, max, limit = 20 } = {}) {
  const cat = readJSON(P.catalog, null);
  if (!cat) die("No catalog yet — run: studio music index");
  const words = String(query).toLowerCase().split(/\s+/).filter(Boolean);
  return cat.items
    .filter((i) => (!type || i.type === type) && (!min || i.duration >= min) && (!max || i.duration <= max))
    .map((i) => {
      const hay = `${i.title} ${i.tags.join(" ")}`.toLowerCase();
      const score = words.reduce((s, w) => s + (hay.includes(w) ? (i.tags.includes(w) ? 2 : 1) : 0), 0);
      return { ...i, score };
    })
    .filter((i) => !words.length || i.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

// Accept a file path, a catalog title, or a search query → absolute file path.
export function resolveAudio(ref, type) {
  if (!ref) return null;
  if (fs.existsSync(ref)) return path.resolve(ref);
  const hits = search(ref, { type, limit: 1 });
  if (!hits.length) die(`No ${type || "audio"} in the library matching "${ref}". Try: studio music list --q <words>`);
  return path.join(P.library, hits[0].path);
}

// "whoosh@0.5", "Riser, Data Error@12:-4" (time, then optional gain dB)
export function parseSfxSpec(s) {
  if (typeof s === "object") return { ref: s.ref ?? s.q ?? s.file, at: parseTime(s.at ?? 0), db: Number(s.db ?? 0) };
  const m = String(s).match(/^(.*)@([\d:.]+)(?::(-?[\d.]+))?$/);
  if (!m) die(`Bad --sfx "${s}" — use name-or-file@time[:gainDb]`);
  return { ref: m[1], at: parseTime(m[2]), db: m[3] !== undefined ? Number(m[3]) : 0 };
}

/**
 * Mix the final soundtrack.
 *  voice:  the video's own audio (talking head / Tella narration)
 *  music:  looped/trimmed to length, normalised, set to `bed` dB under the voice, ducked while speaking
 *  sfx:    placed at timestamps
 *  final:  two-pass loudnorm to `lufs` (default −14, social/YouTube target), true peak −1.5
 */
export function mix(input, { music, bed, duck = true, musicStart = 0, fadeIn = 1, fadeOut = 2.5, sfx = [], voiceDb = 0, lufs = -14, muteVoice = false, out } = {}) {
  const info = probe(input);
  const D = info.duration;
  const hasVoice = info.hasAudio && !muteVoice && !silentTrack(input);
  const bedDb = bed ?? (hasVoice ? -11 : 0);
  const args = ["-i", input];
  const fc = [];
  const mixIns = [];
  let idx = 1;

  if (hasVoice) {
    fc.push(`[0:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${voiceDb}dB,asplit=2[voice][sc]`);
    mixIns.push("[voice]");
  }
  const musicFile = resolveAudio(music, "music");
  if (musicFile) {
    args.push("-stream_loop", "-1", "-i", musicFile);
    const chain =
      `[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,atrim=start=${musicStart}:duration=${D.toFixed(3)},asetpts=PTS-STARTPTS,` +
      `loudnorm=I=-14:TP=-2:LRA=11,volume=${bedDb}dB,afade=t=in:d=${fadeIn},afade=t=out:st=${Math.max(0, D - fadeOut).toFixed(3)}:d=${fadeOut}`;
    if (hasVoice && duck) {
      fc.push(`${chain}[mraw]`);
      // Duck the bed ~8-10 dB while the voice is present; fast attack, slow release so it breathes.
      fc.push(`[mraw][sc]sidechaincompress=threshold=0.015:ratio=10:attack=20:release=450:knee=4[music]`);
    } else {
      fc.push(`${chain}[music]`);
      if (hasVoice) fc.push(`[sc]anullsink`);
    }
    mixIns.push("[music]");
    idx++;
  } else if (hasVoice) fc.push(`[sc]anullsink`);

  const sfxList = sfx.map(parseSfxSpec);
  for (const s of sfxList) {
    const f = resolveAudio(s.ref, "sfx");
    args.push("-i", f);
    const ms = Math.round(s.at * 1000);
    // Level-match SFX to ~-18 LUFS. Clips under 0.4s can't be measured (ebur128 reports ~-70),
    // so those keep their native level; gain is clamped so nothing gets blown up.
    const l = measureLufs(f);
    const match = l !== null && l > -60 ? Math.max(-12, Math.min(12, -18 - l)) : 0;
    fc.push(`[${idx}:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=${(match + (s.db ?? 0)).toFixed(2)}dB,adelay=${ms}|${ms}[sfx${idx}]`);
    mixIns.push(`[sfx${idx}]`);
    console.log(`  sfx  ${fmtTime(s.at)}  ${path.basename(f)}${s.db ? ` (${s.db} dB)` : ""}`);
    idx++;
  }
  if (!mixIns.length) die("Nothing to mix: no voice, music or sfx.");
  if (musicFile) console.log(`  music ${path.basename(musicFile)} @ ${bedDb} dB${hasVoice && duck ? ", ducked under voice" : ""}`);

  fc.push(`${mixIns.join("")}amix=inputs=${mixIns.length}:normalize=0:duration=longest,atrim=duration=${D.toFixed(3)}[mixed]`);

  // Pass 1: render the mix to a temp WAV and measure it.
  const dest = outPath(input, "mixed", "mp4", out);
  const tmpWav = dest + ".mix.wav";
  try {
    ffmpeg([...args, "-filter_complex", fc.join(";"), "-map", "[mixed]", "-c:a", "pcm_s24le", tmpWav]);
    const log = ffmpegAnalyze(["-i", tmpWav, "-af", `loudnorm=I=${lufs}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"]);
    const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
    // Pass 2: linear normalisation with measured values, mux with the untouched video.
    const ln = `loudnorm=I=${lufs}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
    ffmpeg(["-i", input, "-i", tmpWav, "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-af", `${ln},aresample=48000,aformat=channel_layouts=stereo`, "-ac", "2", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", dest]);
  } finally {
    fs.rmSync(tmpWav, { force: true });
  }
  console.log(`\n✔ Mixed → ${dest}  (target ${lufs} LUFS)`);
  return dest;
}

function silentTrack(file) {
  const log = ffmpegAnalyze(["-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"]);
  const m = log.match(/max_volume: (-?[\d.]+|-inf) dB/);
  return !m || m[1] === "-inf" || Number(m[1]) < -60;
}

export function loudness(file) {
  const log = ffmpegAnalyze(["-i", file, "-vn", "-af", "loudnorm=print_format=json", "-f", "null", "-"]);
  const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
  return { lufs: Number(m.input_i), truePeak: Number(m.input_tp), lra: Number(m.input_lra) };
}
