// Transcription (HyperFrames → Parakeet/Whisper) and burned-in, word-highlight captions (ASS via libass).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ROOT, P, die, run, ffmpeg, probe, outPath, readJSON, writeJSON, fmtTime } from "./core.mjs";

const HF = path.join(ROOT, "node_modules", ".bin", "hyperframes");

export const transcriptPathFor = (video) => outPath(video, "transcript", "json");

// Word-level transcript: [{id, text, start, end}], cached next to the video.
export function transcribe(input, { force = false, language } = {}) {
  const dest = transcriptPathFor(input);
  if (fs.existsSync(dest) && !force) return dest;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "studio-tx-"));
  try {
    const args = ["transcribe", path.resolve(input), "--dir", tmp, "--json"];
    if (language) args.push("--language", language);
    const r = run(HF, args, { capture: true, cwd: ROOT });
    const res = JSON.parse(r.stdout.trim().split("\n").pop());
    if (!res.ok) die(`Transcription failed: ${res.reason || r.stdout}\nInstall the model with: npx hyperframes models install parakeet`);
    fs.copyFileSync(res.transcriptPath, dest);
    console.log(`✔ Transcript (${res.engine}, ${res.wordCount} words) → ${dest}`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  writeReadable(input, loadWords(dest));
  return dest;
}

export function loadWords(file) {
  const j = readJSON(file);
  const arr = Array.isArray(j) ? j : j.words || (j.segments || []).flatMap((s) => s.words || []);
  return arr
    .map((w, i) => ({ id: w.id ?? `w${i}`, text: String(w.text ?? w.word ?? "").trim(), start: Number(w.start), end: Number(w.end) }))
    .filter((w) => w.text);
}

// Human/Claude-readable transcript: one sentence per line with time range and word ids.
// This is what Claude reads to pick the hook, find retakes/flubs, and choose cut ranges.
function writeReadable(video, words) {
  const lines = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const a = cur[0], b = cur[cur.length - 1];
    lines.push(`[${fmtTime(a.start)} → ${fmtTime(b.end)}] (${a.id}–${b.id}) ${cur.map((w) => w.text).join(" ")}`);
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    if (prev && w.start - prev.end > 0.9) flush();
    cur.push(w);
    if (/[.!?]$/.test(w.text) || cur.length >= 24) flush();
  });
  flush();
  const file = outPath(video, "transcript", "txt");
  fs.writeFileSync(file, lines.join("\n") + "\n");
  return file;
}

export function printTranscript(video) {
  const file = outPath(video, "transcript", "txt");
  if (!fs.existsSync(file)) writeReadable(video, loadWords(transcribe(video)));
  return fs.readFileSync(file, "utf8");
}

// "w12-w30, w55" → time ranges (to feed cut --remove)
export function wordIdsToRanges(video, spec) {
  const words = loadWords(transcribe(video));
  const idx = new Map(words.map((w, i) => [w.id, i]));
  return String(spec)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((r) => {
      const [a, b = a] = r.split(/\s*-\s*/);
      if (!idx.has(a) || !idx.has(b)) die(`Unknown word id in "${r}"`);
      const wa = words[idx.get(a)], wb = words[idx.get(b)];
      const next = words[idx.get(b) + 1];
      // Remove through to the next kept word's start so no dead air is left behind.
      return [wa.start, next ? Math.min(next.start, wb.end + 0.6) : wb.end];
    });
}

// ---------------------------------------------------------------- caption styles
const hex2ass = (hex, alpha = 0) => {
  const h = hex.replace("#", "");
  return `&H${alpha.toString(16).padStart(2, "0").toUpperCase()}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase();
};

// size = font size as a fraction of the frame's shorter side.
export const CAPTION_STYLES = {
  bold:    { font: "Montserrat", bold: true, weightName: "Montserrat ExtraBold", size: 0.078, upper: true, color: "#FFFFFF", active: "#FFD60A", outline: "#000000", outlineW: 0.008, shadow: 0, box: false },
  soft:    { font: "Poppins", bold: true, weightName: "Poppins SemiBold", size: 0.062, upper: false, color: "#FFFFFF", active: "#F2C14E", outline: "#101010", outlineW: 0.014, shadow: 0, box: false },
  clean:   { font: "Montserrat", bold: true, weightName: "Montserrat Bold", size: 0.066, upper: false, color: "#FFFFFF", active: "#FFFFFF", outline: "#000000", outlineW: 0.006, shadow: 0.004, box: false },
  hormozi: { font: "Montserrat", bold: true, weightName: "Montserrat Black", size: 0.085, upper: true, color: "#FFFFFF", active: "#2BFF6A", outline: "#000000", outlineW: 0.01, shadow: 0.004, box: false },
};

function chunkWords(words, { maxWords, maxChars }) {
  const chunks = [];
  let cur = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i], prev = words[i - 1];
    const len = cur.map((x) => x.text).join(" ").length + w.text.length + 1;
    if (cur.length && (cur.length >= maxWords || len > maxChars || w.start - prev.end > 0.45)) {
      chunks.push(cur);
      cur = [];
    }
    cur.push(w);
    if (/[.!?,;:]$/.test(w.text)) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}

export function buildAss(words, { width, height, style = "bold", pos, maxWords, highlight = true }) {
  const st = CAPTION_STYLES[style] || die(`Unknown caption style "${style}". Options: ${Object.keys(CAPTION_STYLES).join(", ")}`);
  const short = Math.min(width, height);
  const portrait = height > width;
  const size = Math.round(st.size * short * (portrait ? 1 : 0.85));
  const posY = pos ?? (portrait ? 0.7 : 0.86);
  const marginV = Math.round(height * (1 - posY));
  const mW = maxWords ?? (portrait ? 3 : 6);
  const maxChars = portrait ? 18 : 36;
  const ow = Math.max(1, Math.round(st.outlineW * short));
  const sh = Math.round((st.shadow || 0) * short);
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,${st.weightName},${size},${hex2ass(st.color)},${hex2ass(st.active)},${hex2ass(st.box ? st.boxColor : st.outline)},${hex2ass(st.box ? st.boxColor : "#000000", st.box ? 0x10 : 0x60)},${st.bold ? -1 : 0},0,0,0,100,100,1,0,${st.box ? 3 : 1},${ow},${sh},2,${Math.round(width * 0.08)},${Math.round(width * 0.08)},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
  const t = (s) => {
    const cs = Math.max(0, Math.round(s * 100));
    const h = Math.floor(cs / 360000), m = Math.floor((cs % 360000) / 6000), sec = Math.floor((cs % 6000) / 100), c = cs % 100;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
  };
  const clean = (s) => (st.upper ? s.toUpperCase() : s).replace(/[{}\\]/g, "");
  const events = [];
  const chunks = chunkWords(words, { maxWords: mW, maxChars });
  chunks.forEach((chunk, ci) => {
    const nextStart = chunks[ci + 1]?.[0].start ?? Infinity;
    const last = chunk[chunk.length - 1];
    // Transcript word ends often run into the following pause; hold max 0.7s.
    const chunkEnd = Math.min(nextStart, Math.max(last.start + 0.25, Math.min(last.end, last.start + 0.7)));
    chunk.forEach((w, wi) => {
      const s = wi === 0 ? chunk[0].start : w.start;
      const e = wi === chunk.length - 1 ? chunkEnd : chunk[wi + 1].start;
      if (e - s < 0.01) return;
      const pop = wi === 0 ? `{\\fscx88\\fscy88\\t(0,90,\\fscx100\\fscy100)}` : "";
      const text = chunk
        .map((x, xi) =>
          highlight && xi === wi ? `{\\c${hex2ass(st.active)}}${clean(x.text)}{\\c${hex2ass(st.color)}}` : clean(x.text),
        )
        .join(" ");
      events.push(`Dialogue: 0,${t(s)},${t(e)},Cap,,0,0,0,,${pop}${text}`);
    });
  });
  return header + events.join("\n") + "\n";
}

export function buildSrt(words, { maxWords = 7 } = {}) {
  const t = (s) => {
    const ms = Math.round(s * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
  };
  return chunkWords(words, { maxWords, maxChars: 42 })
    .map((c, i) => `${i + 1}\n${t(c[0].start)} --> ${t(Math.min(c[c.length - 1].end, c[c.length - 1].start + 1))}\n${c.map((w) => w.text).join(" ")}\n`)
    .join("\n");
}

const filterQuote = (p) => `'${p.replace(/\\/g, "/").replace(/'/g, "'\\\\''")}'`;

export function captions(input, { style = "bold", pos, maxWords, transcript, burn = true, highlight = true, out } = {}) {
  const info = probe(input);
  const tFile = transcript ? path.resolve(transcript) : transcribe(input);
  const words = loadWords(tFile);
  if (!words.length) die("Transcript has no words.");
  const ass = buildAss(words, { width: info.width, height: info.height, style, pos: pos !== undefined ? Number(pos) : undefined, maxWords: maxWords && Number(maxWords), highlight });
  const assFile = outPath(input, `captions-${style}`, "ass");
  fs.writeFileSync(assFile, ass);
  fs.writeFileSync(outPath(input, "captions", "srt"), buildSrt(words));
  if (!burn) {
    console.log(`✔ Caption files → ${assFile} (+ .srt)`);
    return assFile;
  }
  const dest = outPath(input, "captioned", "mp4", out);
  ffmpeg([
    "-i", input,
    "-vf", `ass=${filterQuote(assFile)}:fontsdir=${filterQuote(P.fonts)}`,
    "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
    ...(info.hasAudio ? ["-c:a", "copy"] : []), "-movflags", "+faststart", dest,
  ]);
  console.log(`\n✔ Captions (${style}) → ${dest}`);
  return dest;
}
