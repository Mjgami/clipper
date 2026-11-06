// HyperFrames graphics: build a branded, sized copy of a template, then lint / preview / render it.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { ROOT, P, die, run, probe, readJSON, writeJSON, slugify } from "./core.mjs";
import { dimsFor } from "./edit.mjs";

const HF = path.join(ROOT, "node_modules", ".bin", "hyperframes");
const BRAND_VARS = [
  ["bg", "color", "Background"],
  ["surface", "color", "Card surface"],
  ["cardText", "color", "Text on cards"],
  ["text", "color", "Text"],
  ["muted", "color", "Muted text"],
  ["accent", "color", "Accent"],
  ["accentInk", "color", "Text on accent"],
  ["fontDisplay", "string", "Display font"],
  ["fontBody", "string", "Body font"],
  ["displayWeight", "number", "Display weight"],
  ["displayCase", "string", "Display text-transform"],
  ["radius", "number", "Corner radius (px @1080)"],
];

export function brands() {
  return readJSON(path.join(P.config, "brands.json"));
}

export function listTemplates() {
  return fs
    .readdirSync(P.templates)
    .filter((f) => f.endsWith(".html"))
    .map((f) => {
      const name = f.replace(/\.html$/, "");
      const m = readJSON(path.join(P.templates, `${name}.json`), {});
      return { name, ...m };
    });
}

function fontFaces() {
  const faces = [];
  for (const f of fs.readdirSync(P.fonts).filter((f) => /\.(ttf|otf|woff2?)$/i.test(f))) {
    const base = f.replace(/\.[^.]+$/, "");
    const italic = /Italic/i.test(base);
    if (/^PlayfairDisplay/.test(base)) {
      faces.push(`@font-face{font-family:"Playfair Display";src:url("fonts/${f}");font-weight:400 900;font-style:${italic ? "italic" : "normal"};}`);
      continue;
    }
    const [family, style = "Regular"] = base.split("-");
    const weights = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 };
    const w = weights[style.replace("Italic", "") || "Regular"] ?? 400;
    faces.push(`@font-face{font-family:"${family}";src:url("fonts/${f}");font-weight:${w};font-style:${italic ? "italic" : "normal"};}`);
  }
  return faces.join("\n");
}

const escAttr = (s) => s.replace(/&/g, "&amp;").replace(/'/g, "&#39;");

/**
 * Build a renderable HyperFrames project for one graphic.
 * Returns { dir, vars, width, height, duration }.
 */
export function buildGraphic(template, { brand = "default", vars = {}, size = "9:16", duration, transparent } = {}) {
  const tplFile = path.join(P.templates, `${template}.html`);
  if (!fs.existsSync(tplFile)) die(`No template "${template}". Available: ${listTemplates().map((t) => t.name).join(", ")}`);
  const manifest = readJSON(path.join(P.templates, `${template}.json`), { variables: [] });
  const b = brands()[brand] || die(`Unknown brand "${brand}". Options: ${Object.keys(brands()).join(", ")}`);
  const [W, H] = dimsFor(size);
  const D = Number(duration ?? manifest.duration ?? 4);
  const isTransparent = transparent ?? manifest.transparent ?? false;

  // Declarations: brand tokens + transparency + template content vars. Defaults = this brand.
  const decls = [
    ...BRAND_VARS.map(([id, type, label]) => ({ id, type, label, default: b[id] })),
    { id: "transparent", type: "boolean", label: "Transparent background", default: isTransparent },
    ...manifest.variables,
  ];
  const known = new Set(decls.map((d) => d.id));
  for (const k of Object.keys(vars)) if (!known.has(k)) console.warn(`⚠ "${template}" has no variable "${k}" (ignored). Known: ${[...known].join(", ")}`);

  const hash = crypto.createHash("sha1").update(JSON.stringify({ template, brand, vars, W, H, D, isTransparent })).digest("hex").slice(0, 8);
  const dir = path.join(P.graphicsBuild, `${template}-${brand}-${W}x${H}-${hash}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
  fs.cpSync(P.fonts, path.join(dir, "fonts"), { recursive: true });
  fs.cpSync(path.join(ROOT, "graphics", "vendor"), path.join(dir, "vendor"), { recursive: true });

  // Local files passed as variables (screenshots, logos) are copied into the build.
  const values = {};
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string" && v && /\.(png|jpe?g|webp|gif|svg|mp4|mov)$/i.test(v) && fs.existsSync(v)) {
      const name = `${k}-${path.basename(v).replace(/[^\w.-]+/g, "_")}`;
      fs.copyFileSync(v, path.join(dir, "assets", name));
      values[k] = `assets/${name}`;
    } else values[k] = v;
  }
  // Bake the resolved values in as defaults so preview == render.
  const finalDecls = decls.map((d) => (d.id in values ? { ...d, default: coerce(values[d.id], d.type) } : d));

  const head = [
    `<script src="vendor/gsap.min.js"></script>`,
    `<script src="vendor/kit.js"></script>`,
    `<style>`,
    fontFaces(),
    `*{margin:0;padding:0;box-sizing:border-box;}`,
    `html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:transparent;}`,
    `#root{position:relative;width:100%;height:100%;overflow:hidden;background:var(--bg);color:var(--text);font-family:var(--fontBody);--u:${(Math.min(W, H) / 100).toFixed(3)}px;--W:${W};--H:${H};-webkit-font-smoothing:antialiased;}`,
    `#root.is-transparent{background:transparent;}`,
    `.w{display:inline-block;overflow:hidden;vertical-align:bottom;padding:0 0.02em 0.08em;margin-bottom:-0.08em;}.wi{display:inline-block;}.accent .wi{color:var(--accent);}`,
    `</style>`,
  ].join("\n    ");
  const orient = W === H ? "square" : H > W ? "portrait" : "landscape";
  const html = fs
    .readFileSync(tplFile, "utf8")
    .replace("__VARS__", escAttr(JSON.stringify(finalDecls)))
    .replace("<!--__HEAD__-->", head)
    .replaceAll("__W__", String(W))
    .replaceAll("__H__", String(H))
    .replaceAll("__DUR__", String(D))
    .replaceAll("__ORIENT__", orient);
  fs.writeFileSync(path.join(dir, "index.html"), html);
  writeJSON(path.join(dir, "hyperframes.json"), { paths: { blocks: "compositions", components: "compositions/components", assets: "assets" } });
  writeJSON(path.join(dir, "meta.json"), { id: path.basename(dir), name: `${template} (${brand})` });
  return { dir, width: W, height: H, duration: D, transparent: isTransparent };
}

function coerce(v, type) {
  if (type === "number") return Number(v);
  if (type === "boolean") return v === true || v === "true";
  return v;
}

export function checkGraphic(dir) {
  run(HF, ["check", dir], { cwd: ROOT });
}

/**
 * Render a template to a file.
 * format: mp4 (opaque), mov (ProRes 4444 with alpha — for overlays / Premiere / AE), webm (VP9 alpha), png-sequence.
 */
export function renderGraphic(template, opts = {}) {
  const { out, quality = "delivery", fps = 30 } = opts;
  const g = buildGraphic(template, opts);
  const format = opts.format || (g.transparent ? "mov" : "mp4");
  const ext = format === "png-sequence" ? "" : `.${format}`;
  const dest = out
    ? path.resolve(out)
    : path.join(ROOT, "graphics", "renders", `${template}-${opts.brand || "default"}-${g.width}x${g.height}-${slugify(Object.values(opts.vars || {}).filter((x) => typeof x === "string").join(" ") || "default").slice(0, 30)}${ext}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  run(HF, ["render", g.dir, "-o", dest, "--format", format, "--quality", quality, "--fps", String(fps), "--quiet"], { cwd: ROOT });
  if (format !== "png-sequence") {
    const info = probe(dest);
    console.log(`\n✔ Graphic [${template} / ${opts.brand || "default"}] → ${dest}\n  ${info.width}x${info.height}, ${info.duration.toFixed(2)}s, ${format}${g.transparent ? " (transparent)" : ""}`);
  } else console.log(`\n✔ PNG sequence → ${dest}`);
  return dest;
}

export function previewGraphic(template, opts = {}) {
  const g = buildGraphic(template, opts);
  run(HF, ["preview", g.dir, "--background"], { cwd: ROOT });
  return g.dir;
}

// Accept --var key=value pairs and/or --vars '{"json":1}' / --vars file.json
export function collectVars(args) {
  let vars = {};
  if (args.vars) {
    const v = String(args.vars);
    vars = fs.existsSync(v) ? readJSON(v) : JSON.parse(v);
  }
  for (const kv of [].concat(args.var || [])) {
    const i = String(kv).indexOf("=");
    if (i < 0) die(`--var expects key=value, got "${kv}"`);
    vars[kv.slice(0, i)] = kv.slice(i + 1);
  }
  return vars;
}

