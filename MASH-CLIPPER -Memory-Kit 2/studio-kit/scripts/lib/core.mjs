// Shared helpers: paths, process running, ffprobe, arg parsing.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const P = {
  projects: path.join(ROOT, "projects"),
  library: path.join(ROOT, "library"),
  epidemic: path.join(ROOT, "library", "epidemic"),
  catalog: path.join(ROOT, "library", "catalog.json"),
  templates: path.join(ROOT, "graphics", "templates"),
  fonts: path.join(ROOT, "graphics", "fonts"),
  graphicsBuild: path.join(ROOT, "graphics", ".build"),
  config: path.join(ROOT, "config"),
};

function firstExisting(cands) {
  for (const c of cands) if (c && fs.existsSync(c)) return c;
  return null;
}
export const FFMPEG =
  firstExisting([process.env.FFMPEG, path.join(ROOT, "node_modules/ffmpeg-static/ffmpeg")]) || "ffmpeg";
export const FFPROBE = firstExisting([process.env.FFPROBE, path.join(ROOT, "bin/ffprobe")]) || "ffprobe";

export class StudioError extends Error {}
export const die = (msg) => {
  throw new StudioError(msg);
};

export function run(cmd, args, { capture = false, quiet = false, cwd } = {}) {
  if (!quiet && !capture) console.log(`\n$ ${path.basename(cmd)} ${args.map(shq).join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 1 << 28,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (r.error) die(`${cmd} failed to start: ${r.error.message}`);
  if (r.status !== 0) {
    const tail = capture ? `\n${(r.stderr || "").split("\n").slice(-25).join("\n")}` : "";
    die(`${path.basename(cmd)} exited with code ${r.status}${tail}`);
  }
  return r;
}

const shq = (s) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${String(s).replace(/'/g, "'\\''")}'`);

// ffmpeg with sane defaults: no banner, errors only, progress stats, overwrite.
export const ffmpeg = (args, opts) =>
  run(FFMPEG, ["-hide_banner", "-loglevel", "error", "-stats", "-y", ...args], opts);

// Run ffmpeg and return stderr (for analysis filters like silencedetect/ebur128).
export function ffmpegAnalyze(args) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostats", ...args], { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) die(`ffmpeg analysis failed:\n${(r.stderr || "").split("\n").slice(-15).join("\n")}`);
  return r.stderr;
}

export function probe(file) {
  if (!fs.existsSync(file)) die(`File not found: ${file}`);
  const r = run(FFPROBE, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], {
    capture: true,
  });
  const j = JSON.parse(r.stdout);
  const v = j.streams.find((s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1);
  const a = j.streams.find((s) => s.codec_type === "audio");
  const fps = v ? evalRate(v.avg_frame_rate) || evalRate(v.r_frame_rate) : null;
  let w = v?.width, h = v?.height;
  const rot = Math.abs(Number(v?.side_data_list?.find((d) => d.rotation != null)?.rotation ?? v?.tags?.rotate ?? 0));
  if (rot === 90 || rot === 270) [w, h] = [h, w];
  return {
    file,
    duration: Number(j.format.duration || v?.duration || a?.duration || 0),
    width: w,
    height: h,
    fps,
    vfr: v ? v.avg_frame_rate !== v.r_frame_rate : false,
    vcodec: v?.codec_name ?? null,
    pixfmt: v?.pix_fmt ?? null,
    hasVideo: !!v,
    hasAudio: !!a,
    acodec: a?.codec_name ?? null,
    sampleRate: a ? Number(a.sample_rate) : null,
    channels: a?.channels ?? null,
    size: Number(j.format.size || 0),
  };
}

function evalRate(r) {
  if (!r || r === "0/0") return null;
  const [n, d] = r.split("/").map(Number);
  return d ? n / d : n;
}

// Minimal argv parser: positionals + --key value / --key=value / --flag. Repeated keys become arrays.
export function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      let [k, v] = a.slice(2).split(/=(.*)/s);
      if (v === undefined) {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("--")) v = argv[++i];
        else v = true;
      }
      if (k.startsWith("no-") && v === true) [k, v] = [k.slice(3), false];
      if (k in out) out[k] = [].concat(out[k], v);
      else out[k] = v;
    } else if (a === "-o") out.out = argv[++i];
    else out._.push(a);
  }
  return out;
}
export const list = (v) => (v === undefined || v === false ? [] : [].concat(v));
export const num = (v, d) => (v === undefined || v === true ? d : Number(v));

// Output path helper: explicit -o, else <dir>/<base>.<suffix>.<ext>
export function outPath(input, suffix, ext, explicit) {
  if (explicit) {
    fs.mkdirSync(path.dirname(path.resolve(explicit)), { recursive: true });
    return path.resolve(explicit);
  }
  const { dir, name } = path.parse(path.resolve(input));
  return path.join(dir, `${name}.${suffix}.${ext ?? "mp4"}`);
}

export const slugify = (s) =>
  String(s).toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "project";

export const fmtTime = (t) => {
  const m = Math.floor(t / 60), s = (t % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
};

export function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    if (fallback !== undefined) return fallback;
    die(`Could not read JSON ${file}: ${e.message}`);
  }
}
export const writeJSON = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
};

// Parse "1:23.5", "83.5", "83.5s" → seconds
export function parseTime(t) {
  if (typeof t === "number") return t;
  const s = String(t).trim().replace(/s$/, "");
  if (s.includes(":")) return s.split(":").reduce((acc, p) => acc * 60 + Number(p), 0);
  const n = Number(s);
  if (Number.isNaN(n)) die(`Bad time: ${t}`);
  return n;
}

// Standard H.264/AAC working-format encode args.
export const WORK_V = ["-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p"];
export const WORK_A = ["-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-ac", "2"];
