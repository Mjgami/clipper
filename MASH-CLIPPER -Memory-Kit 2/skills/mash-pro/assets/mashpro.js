/* Mash Pro runtime: camera shakes + text animators for HyperFrames compositions.
 * Original code for the Claude Motion Kit. Everything is added to ONE paused GSAP timeline and every
 * "random" value comes from a seeded generator, so a render is identical every time and seeking never drifts.
 * Usage:
 *   const tl = gsap.timeline({ paused: true });
 *   const MP = MashPro(tl, { fps: 30, width: 1920 });
 *   MP.shake("#cam", 3.2, "lens");                 // frame shake on the impact frame
 *   MP.text("#hook", 1.0, "scramble");             // text animator
 *   MP.impact("#word", "#cam", 4.1, { text: "pop", shake: "bounce" });  // word + shake + SFX cue in one call
 *   MP.cues                                        // [{t, cue, fx}] -> cues.json for /sound-design
 */
(function () {
  const NEUTRAL = { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
  const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/";

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  window.MashPro = function (tl, opts = {}) {
    const fps = opts.fps || 30, F = 1 / fps;
    const A0 = (opts.width || 1920) / 1920;
    const $ = (s) => (typeof s === "string" ? document.querySelector(s) : s);
    const $$ = (s) => (typeof s === "string" ? Array.from(document.querySelectorAll(s)) : s instanceof Element ? [s] : Array.from(s));
    const cues = [];
    let seedN = opts.seed || 7;
    const cue = (t, kind, fx, on) => { if (on !== false && kind) cues.push({ t: +t.toFixed(3), cue: kind, fx }); };
    // Per-frame sampled motion written as plain sets. Render engines may seek with callbacks suppressed,
    // so anything computed (maps, carousels, numbers) is baked frame by frame instead of using onUpdate.
    function frames(t, d, ease, fn) {
      const e = typeof ease === "function" ? ease : gsap.parseEase(ease), n = Math.max(1, Math.round(d * fps));
      for (let i = 0; i <= n; i++) fn(t + (i * d) / n, e(i / n));
    }

    // Sounds closer than `gap` seconds blur into one mush: keep only the strongest of each cluster.
    const CUE_RANK = { hit: 6, whoosh: 5, swipe: 4, pop: 3, click: 2, shimmer: 1 };
    function mergeCues(list, gap) {
      const out = [];
      list.slice().sort((a, b) => a.t - b.t).forEach((c) => {
        const last = out[out.length - 1];
        if (last && c.t - last.t < gap) { if ((CUE_RANK[c.cue] || 0) > (CUE_RANK[last.cue] || 0)) out[out.length - 1] = { ...c, t: last.t, fx: c.fx + " + " + last.fx }; else last.fx += " + " + c.fx; }
        else out.push({ ...c });
      });
      return out;
    }

    /* ================= MASH SHAKE =================
     * Each preset returns key states. `tween` presets glide between keys; `step` presets snap per frame
     * (flickers, glitches), which is how a real camera hit reads on screen.
     */
    const SHAKES = {
      basic: { cue: "hit", mode: "tween", keys(A, r) {
        const k = []; for (let i = 0; i < 10; i++) { const d = 1 - i / 10;
          k.push([F, { x: (r() * 2 - 1) * 22 * A * d, y: (r() * 2 - 1) * 15 * A * d, rotation: (r() * 2 - 1) * 0.7 * d }]); }
        return k; } },
      quick: { cue: "hit", mode: "tween", keys(A, r) {
        const k = []; for (let i = 0; i < 4; i++) k.push([F, { x: (r() * 2 - 1) * 32 * A, y: (r() * 2 - 1) * 22 * A }]);
        return k; } },
      rumble: { cue: "hit", mode: "tween", keys(A, r, o) {
        const n = Math.round((o.dur || 0.8) * fps), k = [];
        for (let i = 0; i < n; i++) { const d = i > n - 4 ? (n - i) / 4 : 1; k.push([F, { x: (r() * 2 - 1) * 7 * A * d, y: (r() * 2 - 1) * 6 * A * d }]); }
        return k; } },
      bounce: { cue: "hit", mode: "tween", ease: "sine.inOut", keys(A) {
        return [[0.05, { y: 34 * A, scaleX: 1.02, scaleY: 1.02 }], [0.08, { y: -18 * A }], [0.08, { y: 10 * A }], [0.08, { y: -5 * A }], [0.07, { y: 2 * A }]]; } },
      bounce2: { cue: "hit", mode: "tween", ease: "sine.inOut", keys() {
        return [[0.05, { scaleX: 1.09, scaleY: 1.09 }], [0.09, { scaleX: 0.965, scaleY: 0.965 }], [0.09, { scaleX: 1.025, scaleY: 1.025 }], [0.08, { scaleX: 0.99, scaleY: 0.99 }]]; } },
      lens: { cue: "hit", mode: "tween", filter: true, back: 0.38, backEase: "power3.out", keys(A) {
        return [[0.06, { scaleX: 1.14, scaleY: 1.14, rotation: 0.8, filter: "blur(" + (10 * A).toFixed(1) + "px)" }]]; } },
      warp: { cue: "whoosh", mode: "tween", ease: "sine.inOut", keys() {
        return [[0.06, { skewX: 9, scaleX: 1.06 }], [0.07, { skewX: -6, scaleX: 0.97 }], [0.07, { skewX: 3.5, scaleX: 1.02 }], [0.07, { skewX: -1.5, scaleX: 1 }]]; } },
      wave: { cue: "whoosh", mode: "tween", ease: "sine.inOut", keys(A) {
        return [24, -20, 15, -10, 5].map((v, i) => [0.09, { x: v * A, rotation: v / 20 }]); } },
      wave2: { cue: "whoosh", mode: "tween", ease: "sine.inOut", keys(A) {
        return [24, -20, 15, -10, 5].map((v) => [0.09, { y: v * A, rotation: -v / 24 }]); } },
      squeeze: { cue: "hit", mode: "tween", ease: "sine.inOut", keys() {
        return [[0.05, { scaleX: 1.16, scaleY: 0.88 }], [0.09, { scaleX: 0.92, scaleY: 1.06 }], [0.08, { scaleX: 1.05, scaleY: 0.97 }], [0.08, { scaleX: 0.98, scaleY: 1.01 }]]; } },
      squeeze2: { cue: "hit", mode: "tween", ease: "sine.inOut", keys() {
        return [[0.05, { scaleX: 0.88, scaleY: 1.16 }], [0.09, { scaleX: 1.06, scaleY: 0.92 }], [0.08, { scaleX: 0.97, scaleY: 1.05 }], [0.08, { scaleX: 1.01, scaleY: 0.98 }]]; } },
      invert: { cue: "hit", mode: "step", filter: true, keys(A, r) {
        return [2, 2, 1, 1, 1].map((n, i) => [n * F, { x: (r() * 2 - 1) * 14 * A, filter: i % 2 === 0 ? "invert(1)" : "" }]); } },
      glitch: { cue: "click", mode: "step", filter: true, keys(A, r) {
        const k = []; for (let i = 0; i < 8; i++) { const o = (4 + r() * 10) * A;
          k.push([F, { x: (r() * 2 - 1) * 26 * A, skewX: (r() * 2 - 1) * 6,
            filter: "drop-shadow(" + (-o).toFixed(1) + "px 0 0 rgba(255,0,70,.85)) drop-shadow(" + o.toFixed(1) + "px 0 0 rgba(0,235,255,.85))" }]); }
        return k; } },
      whiteFlicker: { cue: "shimmer", mode: "step", filter: true, keys() {
        return [2.4, 1, 1.9, 1, 1.4].map((b) => [2 * F, { filter: b === 1 ? "" : "brightness(" + b + ")" }]); } },
      darkFlicker: { cue: "hit", mode: "step", filter: true, keys() {
        return [0.2, 1, 0.35, 1, 0.6].map((b) => [2 * F, { filter: b === 1 ? "" : "brightness(" + b + ")" }]); } },
    };

    function shake(sel, t, type = "basic", o = {}) {
      const p = SHAKES[type]; if (!p) throw new Error("Mash Pro: unknown shake '" + type + "'. Use: " + Object.keys(SHAKES).join(", "));
      const A = A0 * (o.amp || 1), r = rng(o.seed || seedN++);
      const els = $$(sel);
      els.forEach((el) => {
        const base = getComputedStyle(el).filter; const baseF = !base || base === "none" ? "" : base;
        const fil = (f) => (baseF + " " + (f || "")).trim() || "none";
        const keys = p.keys(A, r, o);
        const full = (k) => { const s = { ...NEUTRAL, ...k }; if (p.filter) s.filter = fil(k.filter); return s; };
        let prev = full({}), at = t;
        const seq = keys.concat([[p.back || 0.08, {}]]);
        seq.forEach(([d, k], i) => {
          const next = full(k);
          if (p.mode === "step" && i < seq.length) tl.set(el, next, at);
          else tl.fromTo(el, prev, { ...next, duration: d, ease: i === seq.length - 1 ? p.backEase || "power2.out" : p.ease || "none", immediateRender: false }, at);
          prev = next; at += d;
        });
        if (p.mode === "step") tl.set(el, full({}), at);
      });
      cue(t, o.cue || p.cue, "shake " + type, o.sfx);
      return t;
    }

    /* ================= MASH TYPE =================
     * split() wraps every word (and every char inside it) in spans once, so text still wraps like normal text.
     */
    function split(el) {
      el = $(el);
      if (el.__mp) return el.__mp;
      const text = el.textContent; el.textContent = "";
      const words = [], chars = [];
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(" ")); return; }
        const w = document.createElement("span"); w.className = "mp-w"; w.style.display = "inline-block";
        Array.from(part).forEach((ch) => { const c = document.createElement("span"); c.className = "mp-c"; c.style.display = "inline-block"; c.textContent = ch; w.appendChild(c); chars.push(c); });
        el.appendChild(w); words.push(w);
      });
      const lines = []; let top = null;
      words.forEach((w) => { if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; } lines[lines.length - 1].push(w); });
      return (el.__mp = { el, text, words, chars, lines });
    }

    function order(n, from, r) {
      const idx = [...Array(n).keys()];
      if (from === "end") return idx.map((i) => n - 1 - i);
      if (from === "center") { const c = (n - 1) / 2; return idx.map((i) => Math.abs(i - c)); }
      if (from === "random") { const o = idx.slice(); for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } const pos = []; o.forEach((v, k) => (pos[v] = k)); return pos; }
      return idx;
    }

    const TEXT = {
      rise:     { by: "words", each: 0.06, dur: 0.42, ease: "power3.out", from: { y: 40, opacity: 0 }, cue: "pop" },
      blur:     { by: "words", each: 0.05, dur: 0.45, ease: "power2.out", from: { y: 10, opacity: 0, filter: "blur(14px)" }, to: { filter: "blur(0px)" }, cue: "shimmer" },
      pop:      { by: "chars", each: 0.025, dur: 0.36, ease: "back.out(2.5)", from: { scale: 0.3, opacity: 0 }, cue: "pop" },
      drop:     { by: "chars", each: 0.03, dur: 0.6, ease: "bounce.out", from: { y: -90, opacity: 0 }, cue: "pop" },
      flip:     { by: "chars", each: 0.03, dur: 0.55, ease: "power3.out", from: { rotationX: -95, opacity: 0, transformPerspective: 600, transformOrigin: "50% 50% -20px" }, cue: "whoosh" },
      slide:    { by: "words", each: 0.05, dur: 0.5, ease: "expo.out", from: { x: 90, opacity: 0, filter: "blur(6px)" }, to: { filter: "blur(0px)" }, cue: "swipe" },
      mask:     { by: "words", each: 0.06, dur: 0.5, ease: "power4.out", from: { yPercent: 45, clipPath: "inset(0% 0% 100% 0%)" }, to: { clipPath: "inset(0% 0% 0% 0%)" }, cue: "swipe" },
      wave:     { by: "chars", each: 0.035, dur: 0.5, ease: "back.out(3)", from: { y: 34, opacity: 0, rotation: 8 }, cue: "pop" },
      stretch:  { by: "chars", each: 0.03, dur: 0.75, ease: "elastic.out(1,0.5)", from: { scaleX: 2.2, scaleY: 0.4, opacity: 0 }, cue: "pop" },
      glow:     { by: "words", each: 0.07, dur: 0.6, ease: "power2.out", from: { opacity: 0, filter: "brightness(2.6) blur(8px)" }, to: { filter: "brightness(1) blur(0px)" }, cue: "shimmer" },
      cascade:  { by: "chars", each: 0.022, dur: 0.4, ease: "power3.out", order: "random", from: { y: 26, opacity: 0, filter: "blur(8px)" }, to: { filter: "blur(0px)" }, cue: "shimmer" },
      tracking: { by: "self", dur: 0.8, ease: "expo.out", from: { letterSpacing: "0.5em", opacity: 0, filter: "blur(10px)" }, to: { letterSpacing: "normal", filter: "blur(0px)" }, cue: "whoosh" },
      scramble: { special: true, each: 0.035, cue: "click" },
      typeOn:   { special: true, each: 0.045, cue: "click" },
    };

    function text(sel, t, style = "rise", o = {}) {
      const p = TEXT[style]; if (!p) throw new Error("Mash Pro: unknown text style '" + style + "'. Use: " + Object.keys(TEXT).join(", "));
      const el = $(sel), r = rng(o.seed || seedN++);
      const each = o.each ?? p.each;
      if (style === "tracking") {
        tl.fromTo(el, { ...p.from }, { opacity: 1, ...p.to, duration: o.dur || p.dur, ease: p.ease }, t);
        cue(t, o.cue || p.cue, "text tracking", o.sfx); return t + (o.dur || p.dur);
      }
      const s = split(el);
      if (style === "scramble") {
        const fx = s.chars.map((c) => c.textContent);
        gsap.set(s.chars, { opacity: 0 });
        s.chars.forEach((c, i) => {
          const start = t + i * each * 0.35, land = t + 0.18 + i * each;
          tl.set(c, { opacity: 1 }, start);
          for (let k = start; k < land - F / 2; k += 2 * F) tl.set(c, { textContent: GLYPHS[Math.floor(r() * GLYPHS.length)] }, k);
          tl.set(c, { textContent: fx[i] }, land);
        });
        cue(t, o.cue || p.cue, "text scramble", o.sfx); return t + 0.18 + s.chars.length * each;
      }
      if (style === "typeOn") {
        gsap.set(s.chars, { opacity: 0 });
        s.chars.forEach((c, i) => tl.set(c, { opacity: 1 }, t + i * each));
        cue(t, o.cue || p.cue, "text typeOn", o.sfx); return t + s.chars.length * each;
      }
      const units = (o.by || p.by) === "chars" ? s.chars : (o.by || p.by) === "lines" ? s.lines.map((l) => l) : s.words;
      const pos = order(units.length, o.from || p.order || "start", r);
      const dur = o.dur || p.dur;
      units.forEach((u, i) => {
        tl.fromTo(u, { ...p.from }, { x: 0, y: 0, yPercent: 0, scale: 1, scaleX: 1, scaleY: 1, rotation: 0, rotationX: 0, opacity: 1, ...(p.to || {}), duration: dur, ease: p.ease }, t + pos[i] * each);
      });
      cue(t, o.cue || p.cue, "text " + style, o.sfx);
      return t + Math.max(...pos) * each + dur;
    }

    const OUT = {
      blur:   { y: -20, opacity: 0, filter: "blur(10px)", ease: "power2.in" },
      up:     { yPercent: -60, opacity: 0, ease: "power3.in" },
      down:   { yPercent: 60, opacity: 0, ease: "power3.in" },
      mask:   { yPercent: -45, clipPath: "inset(100% 0% 0% 0%)", ease: "power3.in" },
      shrink: { scale: 0.6, opacity: 0, filter: "blur(8px)", ease: "back.in(2)" },
    };
    function textOut(sel, t, style = "blur", o = {}) {
      const el = $(sel), s = el.__mp, p = OUT[style];
      const units = s ? (style === "mask" ? s.words : s.chars) : [el];
      const each = o.each ?? (units.length > 1 ? 0.012 : 0);
      units.forEach((u, i) => tl.to(u, { ...p, duration: o.dur || 0.22, immediateRender: false }, t + i * each));
      return t + units.length * each + (o.dur || 0.22);
    }

    /* One call for the most used beat: key word lands + frame hit + ONE SFX cue, all on the same frame. */
    function impact(textSel, camSel, t, o = {}) {
      text(textSel, t, o.text || "pop", { ...o, sfx: false });
      shake(camSel, t + (o.delay || 0), o.shake || "bounce", { ...o, sfx: false });
      cue(t, o.cue || "hit", "impact " + (o.text || "pop") + "+" + (o.shake || "bounce"), o.sfx);
      return t;
    }

    /* ================= MASH SAAS =================
     * Real UI screenshots (or HTML panels) entering, being zoomed into, clicked, flipped through.
     * Whoosh/swipe cues are logged where the move peaks, because /sound-design lands the peak on the cue time.
     */
    const peak = (t, d) => t + d * 0.35;
    const SCREEN = {
      rise3d:  { from: { opacity: 0, y: 140, rotationX: 30, scale: 0.9, transformPerspective: 1400, transformOrigin: "50% 100%" }, dur: 0.95, ease: "expo.out", cue: "whoosh" },
      unfold:  { clip: true, dur: 0.75, ease: "power4.inOut", cue: "swipe" },
      zoomOut: { from: { opacity: 0, scale: 1.35, filter: "blur(16px)" }, to: { filter: "blur(0px)" }, dur: 0.7, ease: "power3.out", cue: "whoosh" },
      flipIn:  { from: { opacity: 0, rotationY: -70, x: 160, transformPerspective: 1400, transformOrigin: "0% 50%" }, dur: 0.85, ease: "expo.out", cue: "whoosh" },
      slideUp: { from: { yPercent: 115 }, dur: 0.75, ease: "expo.out", cue: "swipe" },
      pop:     { from: { opacity: 0, scale: 0.6, y: 40 }, dur: 0.6, ease: "back.out(1.6)", cue: "pop" },
    };
    // screen(sel, t, style, {radius, each, dur}) - several matches enter one after another (`each` apart)
    function screen(sel, t, style = "rise3d", o = {}) {
      const p = SCREEN[style]; if (!p) throw new Error("Mash Pro: unknown screen style '" + style + "'. Use: " + Object.keys(SCREEN).join(", "));
      const d = o.dur || p.dur, r = " round " + (o.radius ?? 22) + "px";
      $$(sel).forEach((el, i) => {
        const at = t + i * (o.each ?? 0.12);
        if (p.clip) tl.fromTo(el, { clipPath: "inset(48% 48% 48% 48%" + r + ")" }, { clipPath: "inset(0% 0% 0% 0%" + r + ")", duration: d, ease: p.ease }, at);
        else tl.fromTo(el, { ...p.from }, { opacity: 1, x: 0, y: 0, yPercent: 0, scale: 1, rotationX: 0, rotationY: 0, ...(p.to || {}), duration: d, ease: p.ease }, at);
      });
      cue(p.cue === "pop" ? t : peak(t, d), o.cue || p.cue, "screen " + style, o.sfx);
      return t + d;
    }

    // Smooth zoom into a spot of a screen and (optionally) back out: zoom(sel, t, {x:"70%", y:"30%", scale:1.8, dur:0.9, hold:1.2})
    function zoom(sel, t, o = {}) {
      const s = o.scale || 1.8, d = o.dur || 0.9;
      tl.set(sel, { transformOrigin: (o.x || "50%") + " " + (o.y || "50%") }, t);
      tl.fromTo(sel, { scale: 1 }, { scale: s, duration: d, ease: "power2.inOut", immediateRender: false }, t);
      if (o.hold != null) tl.to(sel, { scale: 1, duration: d, ease: "power2.inOut", immediateRender: false }, t + d + o.hold);
      cue(peak(t, d), o.cue || "whoosh", "zoom", o.sfx);
      return t + d;
    }

    // Cursor that glides between points and clicks: cursor(parent, [[t, x, y, click?, targetSel?], ...]) - x/y in px inside parent
    const ARROW = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 2.5 20 12l-7.2 1.9-3.7 6.9z" fill="#fff" stroke="#111" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    function cursor(parent, steps, o = {}) {
      parent = $(parent); const size = o.size || 30 * A0;
      const c = document.createElement("div"); c.className = "mp-cursor"; c.innerHTML = ARROW;
      Object.assign(c.style, { position: "absolute", left: 0, top: 0, width: size + "px", height: size + "px", zIndex: 60, pointerEvents: "none", filter: "drop-shadow(0 4px 8px rgba(0,0,0,.45))", opacity: 0 });
      parent.appendChild(c);
      const [t0, x0, y0] = steps[0];
      tl.fromTo(c, { opacity: 0, x: x0, y: y0 + 20, scale: 0.8 }, { opacity: 1, y: y0, scale: 1, duration: 0.25, ease: "power2.out" }, t0 - 0.3);
      steps.forEach(([t, x, y, click, target], i) => {
        if (i > 0) { const [pt] = steps[i - 1]; const d = Math.min(0.75, Math.max(0.2, t - pt - 0.08));
          tl.to(c, { x, y, duration: d, ease: "power3.inOut", immediateRender: false }, t - d); }
        if (!click) return;
        tl.to(c, { scale: 0.8, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, t);
        const rp = document.createElement("div");
        Object.assign(rp.style, { position: "absolute", left: x - size + "px", top: y - size + "px", width: size * 2 + "px", height: size * 2 + "px", borderRadius: "50%",
          border: Math.max(2, size / 10) + "px solid rgba(255,255,255,.9)", opacity: 0, zIndex: 59, pointerEvents: "none" });
        parent.appendChild(rp);
        tl.fromTo(rp, { opacity: 0.95, scale: 0.2 }, { opacity: 0, scale: 1.6, duration: 0.45, ease: "power2.out", immediateRender: false }, t);
        if (target) tl.to(target, { scale: 0.95, duration: 0.08, yoyo: true, repeat: 1, immediateRender: false }, t);
        cue(t, "click", "cursor click", o.sfx);
      });
      tl.to(c, { opacity: 0, duration: 0.2, immediateRender: false }, steps[steps.length - 1][0] + (o.linger ?? 0.5));
      return c;
    }

    // 3D carousel of screens: carousel(sel, [[t, index], ...], {mode:"flow"|"ring", spacing, radius, dur})
    function carousel(sel, stops, o = {}) {
      const items = $$(sel), n = items.length, mode = o.mode || "flow";
      const W = items[0].offsetWidth || 400, sp = o.spacing || W * 0.62, R = o.radius || W * 0.95;
      items.forEach((el) => gsap.set(el, { position: "absolute", left: "50%", top: "50%", xPercent: -50, yPercent: -50, transformPerspective: 1600 }));
      const props = (k) => {
        if (mode === "ring") { const a = (k * 360) / n, rad = (a * Math.PI) / 180, c = Math.cos(rad);
          return { x: Math.sin(rad) * R, z: (c - 1) * R, rotationY: a, opacity: 0.25 + 0.75 * ((c + 1) / 2), zIndex: Math.round(c * 100) + 100 }; }
        const ak = Math.abs(k);
        return { x: k * sp, z: -ak * 220, rotationY: Math.max(-55, Math.min(55, -k * 38)), opacity: Math.max(0, 1 - ak * 0.32), zIndex: 100 - Math.round(ak * 10) };
      };
      const layout = (p, at) => items.forEach((el, i) => (at == null ? gsap.set(el, props(i - p)) : tl.set(el, props(i - p), at)));
      const start = o.start ?? 0;
      layout(start);
      let prev = start;
      stops.forEach(([t, idx]) => {
        const d = o.dur || 0.8, from = prev;
        frames(t, d, "power3.inOut", (tt, q) => layout(from + (idx - from) * q, tt));
        cue(peak(t, d), o.cue || "swipe", "carousel to " + idx, o.sfx);
        prev = idx;
      });
      return items;
    }

    // Slow 3D camera drift on a panel (premium "floating UI" feel): orbit(sel, t, {dur, fromY, fromX, toY, toX, z})
    function orbit(sel, t, o = {}) {
      const d = o.dur || 4;
      tl.fromTo(sel, { rotationY: o.fromY ?? -16, rotationX: o.fromX ?? 10, z: o.z ?? -140, transformPerspective: 1600 },
        { rotationY: o.toY ?? 8, rotationX: o.toX ?? 2, z: 0, duration: d, ease: "sine.inOut" }, t);
      return t + d;
    }

    // Depth parallax: every element gets data-depth (0 far .. 1 near) and slides by dist*depth
    function parallax(sel, t, o = {}) {
      const d = o.dur || 3, dist = (o.dist || 120) * A0;
      $$(sel).forEach((el) => { const z = +(el.dataset.depth || 0.5);
        tl.fromTo(el, { x: dist * z * 0.5 }, { x: -dist * z * 0.5, duration: d, ease: o.ease || "sine.inOut" }, t); });
      return t + d;
    }

    // Stacked screens fan out like cards: fan(sel, t, {spread, gap})
    function fan(sel, t, o = {}) {
      const els = $$(sel), n = els.length, mid = (n - 1) / 2, spread = o.spread ?? 9, gap = (o.gap || 150) * A0;
      els.forEach((el, i) => { const k = i - mid;
        tl.fromTo(el, { x: 0, y: 30, rotation: 0, opacity: i === n - 1 ? 1 : 0, scale: 0.94 },
          { x: k * gap, y: Math.abs(k) * 18 * A0, rotation: k * spread, opacity: 1, scale: 1, duration: 0.8, ease: "expo.out" }, t + Math.abs(k) * 0.05); });
      cue(peak(t, 0.8), o.cue || "whoosh", "fan", o.sfx);
      return t + 0.8;
    }

    /* ================= MASH BG =================
     * Backgrounds built from the footage palette (scripts/palette.py). Every drift is seeded and timeline-driven.
     */
    const BGS = ["fluid", "aurora", "radial", "linear", "spotlight"];
    function bgLayer(container, colors, style, t, dur, r) {
      container = $(container);
      const L = document.createElement("div"); L.className = "mp-bg";
      Object.assign(L.style, { position: "absolute", inset: 0, overflow: "hidden", background: colors[0] });
      container.appendChild(L);
      const blob = (css) => { const b = document.createElement("div"); Object.assign(b.style, { position: "absolute", ...css }); L.appendChild(b); return b; };
      if (style === "fluid") {
        colors.slice(1).concat(colors.slice(1, 2)).forEach((c, i) => {
          const s = 70 + r() * 40, b = blob({ width: s + "%", height: s * 1.6 + "%", left: r() * 70 - 20 + "%", top: r() * 60 - 30 + "%",
            background: "radial-gradient(closest-side, " + c + ", transparent)", opacity: 0.9 });
          tl.fromTo(b, { xPercent: 0, yPercent: 0, scale: 1 }, { xPercent: (r() * 2 - 1) * 35, yPercent: (r() * 2 - 1) * 25, scale: 0.85 + r() * 0.4, duration: dur, ease: "sine.inOut" }, t);
        });
      } else if (style === "aurora") {
        colors.slice(1).forEach((c, i) => {
          const b = blob({ width: "55%", height: "170%", top: "-35%", left: i * 28 - 5 + "%", background: "radial-gradient(ellipse closest-side, " + c + ", transparent)",
            mixBlendMode: "screen", opacity: 0.7, transformOrigin: "50% 0%" });
          tl.fromTo(b, { xPercent: -20, rotation: -14 + i * 6 }, { xPercent: 30, rotation: 10 - i * 5, duration: dur, ease: "sine.inOut" }, t);
        });
      } else if (style === "radial") {
        const b = blob({ inset: "-25%", background: "radial-gradient(circle at 50% 45%, " + colors[2 % colors.length] + " 0%, " + colors[1] + " 30%, transparent 62%)" });
        tl.fromTo(b, { scale: 0.9, opacity: 0.8 }, { scale: 1.12, opacity: 1, duration: dur, ease: "sine.inOut" }, t);
      } else if (style === "linear") {
        const b = blob({ width: "250%", height: "250%", left: "-75%", top: "-75%", background: "conic-gradient(from 0deg, " + colors.slice(1).concat(colors[1]).join(", ") + ")", filter: "blur(" + 60 * A0 + "px)", opacity: 0.85 });
        tl.fromTo(b, { rotation: 0 }, { rotation: 90, duration: dur, ease: "none" }, t);
      } else if (style === "spotlight") {
        const b = blob({ width: "60%", height: "140%", top: "-20%", left: "20%", background: "radial-gradient(ellipse at 50% 0%, " + colors[colors.length - 1] + "cc, transparent 70%)", mixBlendMode: "screen" });
        tl.fromTo(b, { xPercent: -40, rotation: 12 }, { xPercent: 40, rotation: -12, duration: dur, ease: "sine.inOut" }, t);
      }
      return L;
    }
    // bg(container, {colors:[base, c1, c2, c3], style, t, dur}) - colors[0] is the base tone
    function bg(container, o = {}) {
      const style = o.style || "fluid"; if (!BGS.includes(style)) throw new Error("Mash Pro: unknown bg '" + style + "'. Use: " + BGS.join(", "));
      return bgLayer(container, o.colors || ["#0b0f0c", "#1f6f3f", "#46f07a", "#ff8a3d"], style, o.t || 0, o.dur || 10, rng(o.seed || seedN++));
    }
    // Switch to a new background at t: bgSwitch(container, t, {colors, style, transition:"fade"|"wipe"|"circle"|"blur", dur})
    function bgSwitch(container, t, o = {}) {
      const L = bg(container, { ...o, t });
      const tr = o.transition || "circle", d = o.tdur || 0.6;
      if (tr === "fade") tl.fromTo(L, { opacity: 0 }, { opacity: 1, duration: d, ease: "power2.inOut" }, t);
      else if (tr === "wipe") tl.fromTo(L, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: d, ease: "power4.inOut" }, t);
      else if (tr === "circle") tl.fromTo(L, { clipPath: "circle(0% at " + (o.at || "50% 50%") + ")" }, { clipPath: "circle(150% at " + (o.at || "50% 50%") + ")", duration: d * 1.2, ease: "power3.in" }, t);
      else if (tr === "blur") tl.fromTo(L, { opacity: 0, filter: "blur(30px)", scale: 1.1 }, { opacity: 1, filter: "blur(0px)", scale: 1, duration: d, ease: "power2.out" }, t);
      cue(tr === "fade" || tr === "blur" ? peak(t, d) : t + d * 0.6, o.cue || (tr === "fade" ? "shimmer" : "swipe"), "bg switch " + tr, o.sfx);
      return L;
    }
    // Warm light leak sweeping across the frame (put the container above the footage)
    function lightLeak(container, t, o = {}) {
      container = $(container); const d = o.dur || 1.4, c = o.color || "#ff9a3c";
      const b = document.createElement("div");
      Object.assign(b.style, { position: "absolute", inset: 0, pointerEvents: "none", opacity: 0,
        background: "radial-gradient(55% 85% at 50% 50%, " + c + "f0 0%, " + c + "90 35%, " + c + "00 75%)" });
      container.appendChild(b);
      tl.fromTo(b, { xPercent: -70, rotation: -12 }, { xPercent: 70, rotation: 10, duration: d, ease: "sine.inOut", immediateRender: false }, t);
      tl.to(b, { keyframes: [{ opacity: o.peak || 0.85, duration: d * 0.4 }, { opacity: 0, duration: d * 0.6 }], immediateRender: false }, t);
      cue(t + d * 0.3, o.cue || "shimmer", "light leak", o.sfx);
      return b;
    }

    /* ================= MASH MAP =================
     * Needs assets/mashworld.js (country outlines). Land is one world-space SVG moved by its viewBox (the camera);
     * routes, pins and labels live in a screen-space overlay that is re-placed on every camera frame,
     * so they stay the same size at any zoom. Call flyTo/route/pin/highlight in time order.
     */
    const SVGNS = "http://www.w3.org/2000/svg";
    const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
    function map(container, o = {}) {
      container = $(container);
      if (!window.MASH_WORLD) throw new Error("Mash Pro: load mashworld.js before using MP.map");
      // at build time the page may not be laid out yet (render engines size #root later): fall back to the composition size
      const root = container.closest("[data-width]");
      const W = o.width || container.clientWidth || (root ? +root.dataset.width : 1920), H = o.height || container.clientHeight || (root ? +root.dataset.height : 1080);
      const col = { sea: "#06100a", land: "#17271d", stroke: "#2f513b", route: "#46f07a", pin: "#ff8a3d", text: "#ffffff", ...(o.colors || {}) };
      const P = (lon, lat) => { const la = Math.max(-84, Math.min(84, lat)) * Math.PI / 180;
        return [((lon + 180) / 360) * 1000, (1 - Math.log(Math.tan(Math.PI / 4 + la / 2)) / Math.PI) / 2 * 1000]; };
      const box = document.createElement("div"); Object.assign(box.style, { position: "absolute", inset: 0, overflow: "hidden", background: col.sea }); box.setAttribute("data-layout-allow-overflow", "");
      const land = svgEl("svg", { width: "100%", height: "100%", preserveAspectRatio: "xMidYMid slice" }); land.style.position = "absolute";
      const paths = {};
      Object.entries(window.MASH_WORLD).forEach(([name, rings]) => {
        let d = ""; // a jump of more than 180 degrees of longitude is the date line: start a new sub-path instead of drawing across the map
        rings.forEach((r) => { for (let i = 0; i < r.length; i += 2) { const [x, y] = P(r[i], r[i + 1]); d += (i && Math.abs(r[i] - r[i - 2]) < 180 ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); } d += "Z"; });
        const p = svgEl("path", { d, fill: col.land, stroke: col.stroke, "stroke-width": 1, "vector-effect": "non-scaling-stroke", "stroke-linejoin": "round" });
        land.appendChild(p); paths[name] = p;
      });
      const over = svgEl("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H }); Object.assign(over.style, { position: "absolute", inset: 0, overflow: "visible" });
      const pins = document.createElement("div"); Object.assign(pins.style, { position: "absolute", inset: 0 });
      box.append(land, over, pins); container.appendChild(box);

      const c0 = P(...(o.center || [10, 25]));
      const cam0 = { cx: c0[0], cy: c0[1], z: o.zoom || 1 };
      const flies = [], items = [], EASE = gsap.parseEase("power2.inOut");
      // camera at any time: eased pan, geometric zoom (feels like a real push-in)
      const camAt = (time) => {
        let c = cam0;
        for (const f of flies) {
          if (time < f.t) break;
          if (time < f.t + f.d) { const q = EASE((time - f.t) / f.d);
            return { cx: f.from.cx + (f.to.cx - f.from.cx) * q, cy: f.from.cy + (f.to.cy - f.from.cy) * q, z: f.from.z * Math.pow(f.to.z / f.from.z, q) }; }
          c = f.to;
        }
        return c;
      };
      const flyEnd = () => (flies.length ? flies[flies.length - 1].t + flies[flies.length - 1].d : 0);
      const toScreen = (c, x, y) => { const vw = 1000 / c.z, vh = vw * H / W; return [(x - (c.cx - vw / 2)) / vw * W, (y - (c.cy - vh / 2)) / vh * H]; };
      const vb = (c) => { const vw = 1000 / c.z, vh = vw * H / W; return [c.cx - vw / 2, c.cy - vh / 2, vw, vh].map((v) => v.toFixed(2)).join(" "); };
      const put = (el, props, at) => (at == null ? gsap.set(el, props) : tl.set(el, props, at));
      const routeP = (it, time) => EASE(Math.max(0, Math.min(1, (time - it.t) / it.d)));
      // write one overlay item for camera c (at = timeline time, or null for the initial state)
      function place(it, c, at, time) {
        if (it.kind === "pin") { const [x, y] = toScreen(c, it.x, it.y); return put(it.el, { x, y }, at); }
        const p = routeP(it, time);
        put(it.path, { attr: { d: "M" + it.pts.map((q) => toScreen(c, q[0], q[1]).map((v) => v.toFixed(1)).join(" ")).join("L") }, strokeDashoffset: 1 - p }, at);
        const h = toScreen(c, ...it.pts[Math.round(p * (it.pts.length - 1))]);
        put(it.head, { attr: { cx: h[0], cy: h[1] }, opacity: p > 0 && p < 1 ? 1 : 0 }, at);
      }
      // keep an item placed for every frame from `t` until the camera stops moving
      const follow = (it, t, until) => { place(it, camAt(t), null, t); if (until > t) frames(t, until - t, "none", (tt) => place(it, camAt(tt), tt, tt)); };
      land.setAttribute("viewBox", vb(cam0));

      // flyTo(t, [lon,lat], zoom, {dur}) - smooth camera move; everything already on the map rides along
      function flyTo(t, center, zoom, fo = {}) {
        const [x, y] = P(...center), d = fo.dur || 1.6;
        flies.push({ t, d, from: flies.length ? flies[flies.length - 1].to : cam0, to: { cx: x, cy: y, z: zoom } });
        frames(t, d, "none", (tt) => { const c = camAt(tt); tl.set(land, { attr: { viewBox: vb(c) } }, tt); items.forEach((it) => place(it, c, tt, tt)); });
        cue(peak(t, d), fo.cue || "whoosh", "map flyTo", fo.sfx); return t + d;
      }
      // route(t, [lon,lat], [lon,lat], {dur, color, arc, width}) - curved line draws with a glowing head
      function route(t, a, b, ro = {}) {
        const A = P(...a), B = P(...b), dx = B[0] - A[0], dy = B[1] - A[1], k = ro.arc ?? 0.25;
        const C = [(A[0] + B[0]) / 2 + dy * k, (A[1] + B[1]) / 2 - Math.abs(dx) * k];
        const pts = []; for (let i = 0; i <= 48; i++) { const u = i / 48; pts.push([(1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * C[0] + u * u * B[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * C[1] + u * u * B[1]]); }
        const c = ro.color || col.route, w = ro.width || 3, d = ro.dur || 1.4;
        const path = svgEl("path", { fill: "none", stroke: c, "stroke-width": w, "stroke-linecap": "round", pathLength: 1, "stroke-dasharray": 1 });
        path.style.filter = "drop-shadow(0 0 6px " + c + ")"; path.style.strokeDashoffset = 1;
        const head = svgEl("circle", { r: w * 1.8, fill: "#fff" }); head.style.filter = "drop-shadow(0 0 8px " + c + ")"; head.style.opacity = 0;
        over.append(path, head);
        const it = { kind: "route", pts, path, head, t, d }; items.push(it);
        follow(it, t, Math.max(t + d, flyEnd()));
        cue(peak(t, d), ro.cue || "swipe", "map route", ro.sfx); return t + d;
      }
      // pin(t, [lon,lat], "Dubai", {color, size}) - dot pops, ring pulses, label rises
      function pin(t, at, label, po = {}) {
        const [x, y] = P(...at), c = po.color || col.pin, s = po.size || Math.max(8, W / 110);
        const el = document.createElement("div"); Object.assign(el.style, { position: "absolute", left: 0, top: 0, width: 0, height: 0 });
        el.innerHTML = '<div class="mp-ring" style="position:absolute;left:' + -s + 'px;top:' + -s + 'px;width:' + 2 * s + 'px;height:' + 2 * s + 'px;border-radius:50%;border:2px solid ' + c + ';opacity:0"></div>' +
          '<div class="mp-dot" style="position:absolute;left:' + -s / 2 + 'px;top:' + -s / 2 + 'px;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + c + ';box-shadow:0 0 ' + s + 'px ' + c + '"></div>' +
          (label ? '<div class="mp-lab" style="position:absolute;left:' + s * 1.1 + 'px;top:' + -s * 2.4 + 'px;white-space:nowrap;font:600 ' + s * 1.4 + 'px Inter,system-ui,sans-serif;color:' + col.text + ';text-shadow:0 2px 10px rgba(0,0,0,.7)">' + label + "</div>" : "");
        pins.appendChild(el);
        const it = { kind: "pin", el, x, y }; items.push(it);
        follow(it, t, flyEnd());
        const ringEl = el.querySelector(".mp-ring");
        tl.fromTo(el.querySelector(".mp-dot"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)" }, t);
        tl.fromTo(ringEl, { scale: 0.4 }, { scale: 2, duration: 0.75, ease: "power2.out" }, t);
        tl.set(ringEl, { opacity: 0.9 }, t);
        tl.to(ringEl, { opacity: 0, duration: 0.75, ease: "power2.out", immediateRender: false }, t + 0.001);
        if (label) tl.fromTo(el.querySelector(".mp-lab"), { y: 12, opacity: 0, filter: "blur(6px)" }, { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.4, ease: "power3.out" }, t + 0.12);
        cue(t, po.cue || "pop", "map pin " + (label || ""), po.sfx); return t;
      }
      // highlight(t, "India", color) - country fills with the accent and glows
      function highlight(t, name, c, ho = {}) {
        const p = paths[name]; if (!p) throw new Error("Mash Pro: no country '" + name + "' in mashworld.js");
        c = c || col.route; land.appendChild(p); // bring to front so the outline is clean
        tl.fromTo(p, { fill: col.land }, { fill: c, duration: ho.dur || 0.6, ease: "power2.out" }, t);
        tl.fromTo(p, { filter: "drop-shadow(0 0 0px " + c + ")" }, { filter: "drop-shadow(0 0 5px " + c + ")", duration: ho.dur || 0.6 }, t);
        cue(t, ho.cue || "shimmer", "map highlight " + name, ho.sfx); return t;
      }
      return { flyTo, route, pin, highlight, el: box, countries: Object.keys(paths) };
    }

    /* ================= MASH DATA ================= */
    const fmtNum = (v, o) => (o.prefix || "") + v.toLocaleString("en-US", { minimumFractionDigits: o.decimals || 0, maximumFractionDigits: o.decimals || 0 }) + (o.suffix || "");
    // count(sel, t, from, to, {dur, prefix, suffix, decimals}) - rolling number, pop cue when it lands
    function count(sel, t, from, to, o = {}) {
      const el = $(sel), d = o.dur || 1.2;
      el.textContent = fmtNum(from, o);
      frames(t, d, "power3.out", (tt, q) => { const v = from + (to - from) * q; tl.set(el, { textContent: fmtNum(o.decimals ? v : Math.round(v), o) }, tt); });
      cue(t + d * 0.85, o.cue || "pop", "count to " + to, o.sfx); return t + d;
    }
    // bars(container, t, [{label, value, color?}], {color, max, suffix, each}) - bars grow from the baseline with live values
    function bars(container, t, data, o = {}) {
      container = $(container); const max = o.max || Math.max(...data.map((d) => d.value)), c = o.color || "#46f07a";
      const wrap = document.createElement("div"); Object.assign(wrap.style, { position: "absolute", inset: "12% 10% 20% 10%", display: "flex", alignItems: "flex-end", gap: "6%" });
      container.appendChild(wrap);
      data.forEach((d, i) => {
        const bc = d.color || c, col = document.createElement("div");
        Object.assign(col.style, { flex: 1, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", position: "relative" });
        col.innerHTML = '<div class="mp-v" style="font:700 1em Inter,system-ui,sans-serif;color:#fff;margin-bottom:6px">0</div>' +
          '<div class="mp-b" style="width:100%;height:' + (d.value / max) * 82 + '%;border-radius:8px 8px 3px 3px;background:linear-gradient(180deg,' + bc + ',' + bc + '55);transform-origin:50% 100%"></div>' +
          '<div style="position:absolute;top:100%;margin-top:8px;font:500 .8em Inter,system-ui,sans-serif;color:#cfd8d2;white-space:nowrap">' + d.label + "</div>";
        wrap.appendChild(col);
        const at = t + i * (o.each ?? 0.12), ve = col.querySelector(".mp-v");
        tl.fromTo(col.querySelector(".mp-b"), { scaleY: 0 }, { scaleY: 1, duration: 0.8, ease: "expo.out" }, at);
        frames(at, 0.8, "expo.out", (tt, q) => tl.set(ve, { textContent: fmtNum(Math.round(d.value * q), o) }, tt));
        tl.fromTo(ve, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, at);
      });
      cue(t, o.cue || "swipe", "bars", o.sfx); return wrap;
    }
    // ring(container, t, pct, {color, label, dur}) - progress ring draws to pct with the number in the middle
    function ring(container, t, pct, o = {}) {
      container = $(container); const c = o.color || "#46f07a", d = o.dur || 1.3, R = 42, L = 2 * Math.PI * R;
      const wrap = document.createElement("div"); Object.assign(wrap.style, { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" });
      wrap.innerHTML = '<div style="position:relative;height:72%;aspect-ratio:1"><svg viewBox="0 0 100 100" width="100%" height="100%" style="transform:rotate(-90deg)">' +
        '<circle cx="50" cy="50" r="' + R + '" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="7"/>' +
        '<circle class="mp-arc" cx="50" cy="50" r="' + R + '" fill="none" stroke="' + c + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + L + '" stroke-dashoffset="' + L + '" style="filter:drop-shadow(0 0 4px ' + c + ')"/></svg>' +
        '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff">' +
        '<div class="mp-n" style="font:800 2.2em Inter,system-ui,sans-serif">0%</div>' + (o.label ? '<div style="font:500 .85em Inter,system-ui,sans-serif;color:#cfd8d2">' + o.label + "</div>" : "") + "</div></div>";
      container.appendChild(wrap);
      tl.fromTo(wrap.querySelector(".mp-arc"), { strokeDashoffset: L }, { strokeDashoffset: L * (1 - pct / 100), duration: d, ease: "power3.inOut" }, t);
      count(wrap.querySelector(".mp-n"), t, 0, pct, { dur: d, suffix: "%", sfx: o.sfx, cue: o.cue });
      return wrap;
    }
    // line(container, t, [values], {color, dur}) - line chart draws left to right with a soft area fill and an end dot
    function line(container, t, vals, o = {}) {
      container = $(container); const c = o.color || "#46f07a", d = o.dur || 1.6, max = Math.max(...vals), min = Math.min(0, ...vals);
      const pts = vals.map((v, i) => [5 + (i / (vals.length - 1)) * 90, 90 - ((v - min) / (max - min || 1)) * 75]);
      let dl = "M" + pts[0].join(" "); for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2; dl += " C" + mx + " " + y0 + " " + mx + " " + y1 + " " + x1 + " " + y1; }
      const wrap = document.createElement("div"); Object.assign(wrap.style, { position: "absolute", inset: "8%" });
      const gid = "mpg" + seedN++, end = pts[pts.length - 1];
      wrap.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible"><defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity=".45"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient>' +
        '<clipPath id="' + gid + 'c"><rect class="mp-clip" x="0" y="0" width="0" height="100"/></clipPath></defs>' +
        '<path d="' + dl + ' L95 90 L5 90Z" fill="url(#' + gid + ')" clip-path="url(#' + gid + 'c)"/>' +
        '<path class="mp-line" d="' + dl + '" fill="none" stroke="' + c + '" stroke-width="2.4" vector-effect="non-scaling-stroke" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 4px ' + c + ')"/></svg>' +
        '<div class="mp-end" style="position:absolute;left:' + end[0] + '%;top:' + end[1] + '%;width:12px;height:12px;margin:-6px;border-radius:50%;background:#fff;box-shadow:0 0 12px ' + c + '"></div>';
      container.appendChild(wrap);
      tl.fromTo(wrap.querySelector(".mp-line"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: d, ease: "power2.inOut" }, t);
      tl.fromTo(wrap.querySelector(".mp-clip"), { attr: { width: 0 } }, { attr: { width: 100 }, duration: d, ease: "power2.inOut" }, t);
      tl.fromTo(wrap.querySelector(".mp-end"), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(3)" }, t + d - 0.05);
      cue(peak(t, d), o.cue || "swipe", "line chart", o.sfx);
      return wrap;
    }

    /* ================= MASH BEAT =================
     * beats: seconds from scripts/beats.py (beats.json). The music already carries the beat, so these log no SFX cues.
     */
    function onBeats(beats, fn, o = {}) {
      const every = o.every || 1, a = o.from ?? 0, b = o.to ?? Infinity;
      beats.filter((t) => t >= a && t <= b).forEach((t, i) => { if (i % every === 0) fn(t, i / every); });
    }
    const beatShake = (sel, beats, type = "quick", o = {}) => onBeats(beats, (t) => shake(sel, t, type, { amp: o.amp || 0.5, sfx: false }), o);
    const beatFlash = (sel, beats, o = {}) => onBeats(beats, (t) => tl.fromTo(sel, { opacity: o.peak || 0.35 }, { opacity: 0, duration: o.dur || 0.25, ease: "power2.out", immediateRender: false }, t), o);

    /* ================= MASH PRESETS =================
     * One-line combos built from the moves above. Fonts and colours come from the theme tokens (--mk-display, --mk-serif,
     * --mk-accent, --mk-text, --mk-muted), so a preset matches every project. No boxes: only type, lines and light.
     * Sizes are written for a 1920-wide frame and scale with `width`; pass {size: 1.2} to go bigger.
     */
    const F_DISP = "var(--mk-display, 'Inter Tight', sans-serif)", F_SERIF = "var(--mk-serif, 'Instrument Serif', serif)";
    const ACC = "var(--mk-accent, #46f07a)", GLOW = "var(--mk-accent-glow, rgba(70,240,122,.45))", TXT = "var(--mk-text, #fff)", MUTED = "var(--mk-muted, rgba(255,255,255,.8))";
    const px = (v, o) => Math.round(v * A0 * (o.size || 1)) + "px";
    const SH = (o) => "0 " + px(2, o) + " " + px(22, o) + " rgba(0,0,0,.55)";  // soft shadow: readable on any background, no box
    function add(parent, css, html) {
      const d = document.createElement("div"); Object.assign(d.style, { position: "absolute", ...css }); if (html != null) d.innerHTML = html;
      $(parent).appendChild(d); return d;
    }
    const sub = (parent, css, txt) => { const d = document.createElement("div"); Object.assign(d.style, css); d.textContent = txt; parent.appendChild(d); return d; };

    // title(container, t, {lead, word, sub, at:"center"|"bottom", style, cam, shake, hold}) - serif lead line, big key word, optional sub line
    function title(container, t, o = {}) {
      const w = add(container, { left: "6%", right: "6%", textAlign: "center", ...(o.at === "bottom" ? { bottom: "9%" } : { top: "50%", transform: "translateY(-50%)" }) });
      const L = o.lead && sub(w, { font: "italic 400 " + px(68, o) + " " + F_SERIF, color: TXT, marginBottom: px(8, o), textShadow: SH(o) }, o.lead);
      const K = sub(w, { font: "900 " + px(176, o) + "/0.95 " + F_DISP, color: TXT, textShadow: "0 0 " + px(40, o) + " " + GLOW + ", " + SH(o) }, o.word);
      const S = o.sub && sub(w, { font: "500 " + px(38, o) + " " + F_DISP, color: MUTED, marginTop: px(20, o), textShadow: SH(o) }, o.sub);
      const kt = L ? text(L, t, "blur", { sfx: false }) - 0.15 : t;
      text(K, kt, o.style || "pop", { sfx: false });
      if (o.cam) shake(o.cam, kt, o.shake || "bounce", { sfx: false, amp: o.amp || 0.8 });
      cue(kt, "hit", "title " + o.word, o.sfx);
      if (S) text(S, kt + 0.35, "rise", { sfx: false });
      if (o.hold) [L, K, S].filter(Boolean).forEach((e, i) => textOut(e, kt + o.hold + i * 0.04, "blur"));
      return kt;
    }

    // lowerThird(container, t, {name, role, side:"left"|"right", hold}) - accent bar draws, name rises from a mask, role blurs in
    function lowerThird(container, t, o = {}) {
      const right = o.side === "right";
      const w = add(container, { bottom: "11%", [right ? "right" : "left"]: "6%", display: "flex", flexDirection: right ? "row-reverse" : "row", alignItems: "stretch", gap: px(22, o), textAlign: right ? "right" : "left" });
      const bar = document.createElement("div"); Object.assign(bar.style, { width: px(6, o), borderRadius: px(3, o), background: ACC, boxShadow: "0 0 " + px(18, o) + " " + GLOW, transformOrigin: "50% 100%" }); w.appendChild(bar);
      const col = document.createElement("div"); w.appendChild(col);
      const N = sub(col, { font: "800 " + px(58, o) + "/1.05 " + F_DISP, color: TXT, textShadow: SH(o) }, o.name);
      const R = o.role && sub(col, { font: "italic 400 " + px(40, o) + " " + F_SERIF, color: MUTED, marginTop: px(4, o), textShadow: SH(o) }, o.role);
      tl.fromTo(bar, { scaleY: 0 }, { scaleY: 1, duration: 0.45, ease: "expo.out" }, t);
      text(N, t + 0.1, "mask", { sfx: false });
      if (R) text(R, t + 0.3, "blur", { sfx: false });
      cue(t, o.cue || "swipe", "lower third " + o.name, o.sfx);
      if (o.hold) { const e = t + o.hold; textOut(N, e, "mask"); if (R) textOut(R, e, "blur"); tl.to(bar, { scaleY: 0, duration: 0.3, ease: "power3.in", immediateRender: false }, e + 0.05); }
      return w;
    }

    // callout(container, t, {x, y, text, dx, dy}) - point at something (px in the frame): dot pops, line draws, label rises
    function callout(container, t, o = {}) {
      const x = o.x, y = o.y, dx = o.dx ?? 180 * A0, dy = o.dy ?? -140 * A0, r = 9 * A0 * (o.size || 1);
      const svg = svgEl("svg", { width: "100%", height: "100%" }); Object.assign(svg.style, { position: "absolute", inset: 0, overflow: "visible" });
      const ln = svgEl("path", { d: "M" + x + " " + y + " L" + (x + dx * 0.35) + " " + (y + dy) + " L" + (x + dx) + " " + (y + dy), fill: "none", stroke: "#fff", "stroke-width": 2.5 * A0 * (o.size || 1) + 1, pathLength: 1, "stroke-dasharray": 1, "stroke-linejoin": "round" });
      ln.style.strokeDashoffset = 1;
      const dot = svgEl("circle", { cx: x, cy: y, r, fill: "#fff" }); dot.style.transformOrigin = x + "px " + y + "px";
      svg.append(ln, dot); $(container).appendChild(svg);
      const lab = add(container, { left: x + dx + (dx >= 0 ? 14 : -14) * A0 + "px", top: y + dy + "px", transform: "translate(" + (dx >= 0 ? "0" : "-100%") + ",-50%)",
        font: "600 " + px(36, o) + " " + F_DISP, color: TXT, whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,.6)" });
      lab.textContent = o.text;
      tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, t);
      tl.fromTo(ln, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.45, ease: "power2.inOut" }, t + 0.1);
      text(lab, t + 0.45, "rise", { sfx: false });
      cue(t, o.cue || "pop", "callout " + o.text, o.sfx);
      if (o.hold) { const e = t + o.hold; tl.to([dot, ln], { opacity: 0, duration: 0.25, immediateRender: false }, e); textOut(lab, e, "blur"); }
      return lab;
    }

    // transition(outSel, inSel, t, type, {at}) - scene change. The incoming scene stays hidden until its moment.
    const TRANS = {
      whip: { cue: "whoosh", d: 0.45, go(a, b, t) {
        tl.to(a, { xPercent: -55, filter: "blur(30px)", duration: 0.22, ease: "power3.in", immediateRender: false }, t);
        tl.fromTo(b, { xPercent: 55, filter: "blur(30px)" }, { xPercent: 0, filter: "blur(0px)", duration: 0.3, ease: "power3.out", immediateRender: false }, t + 0.2); return t + 0.2; } },
      zoom: { cue: "whoosh", d: 0.5, go(a, b, t) {
        tl.to(a, { scale: 2.4, filter: "blur(20px)", duration: 0.25, ease: "power3.in", immediateRender: false }, t);
        tl.fromTo(b, { scale: 0.6, filter: "blur(20px)" }, { scale: 1, filter: "blur(0px)", duration: 0.35, ease: "power3.out", immediateRender: false }, t + 0.22); return t + 0.22; } },
      push: { cue: "swipe", d: 0.6, go(a, b, t) {
        tl.to(a, { yPercent: -100, duration: 0.6, ease: "power4.inOut", immediateRender: false }, t);
        tl.fromTo(b, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "power4.inOut", immediateRender: false }, t); return t; } },
      circle: { cue: "swipe", d: 0.6, go(a, b, t, o) { const at = o.at || "50% 50%";
        tl.fromTo(b, { clipPath: "circle(0% at " + at + ")" }, { clipPath: "circle(150% at " + at + ")", duration: 0.6, ease: "power3.in", immediateRender: false }, t); return t; } },
      blur: { cue: "shimmer", d: 0.5, go(a, b, t) {
        tl.to(a, { opacity: 0, filter: "blur(24px)", duration: 0.45, ease: "power2.inOut", immediateRender: false }, t);
        tl.fromTo(b, { opacity: 0, filter: "blur(24px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.45, ease: "power2.inOut", immediateRender: false }, t); return t; } },
      flash: { cue: "hit", d: 0.45, go(a, b, t, o) {
        const f = add(o.layer || b.parentElement, { inset: 0, background: "#fff", opacity: 0, pointerEvents: "none", zIndex: 50 });
        tl.fromTo(f, { opacity: 0 }, { opacity: 1, duration: 0.08, ease: "power2.in", immediateRender: false }, t);
        tl.to(f, { opacity: 0, duration: 0.4, ease: "power2.out", immediateRender: false }, t + 0.08); return t + 0.08; } },
      glitch: { cue: "click", d: 0.3, go(a, b, t) { const r = rng(seedN++);
        for (let i = 0; i < 8; i++) { const o2 = (6 + r() * 14) * A0, tgt = i < 4 ? a : b;
          tl.set(tgt, { x: (r() * 2 - 1) * 40 * A0, filter: "drop-shadow(" + -o2 + "px 0 0 rgba(255,0,70,.9)) drop-shadow(" + o2 + "px 0 0 rgba(0,235,255,.9))" }, t + i * F); }
        tl.set(b, { x: 0, filter: "none" }, t + 8 * F); return t + 4 * F; } },
    };
    function transition(outSel, inSel, t, type = "whip", o = {}) {
      const p = TRANS[type]; if (!p) throw new Error("Mash Pro: unknown transition '" + type + "'. Use: " + Object.keys(TRANS).join(", "));
      const a = $(outSel), b = $(inSel);
      gsap.set(b, { opacity: 0 });
      const swap = p.go(a, b, t, o);
      tl.set(b, { opacity: 1 }, swap);
      tl.set(a, { opacity: 0 }, t + p.d);
      cue(type === "push" || type === "circle" ? t + p.d * 0.5 : swap, o.cue || p.cue, "transition " + type, o.sfx);
      return t + p.d;
    }

    // endCard(container, t, {line, cta, handle}) - closing line lands, the call to action gets an underline, handle fades up
    function endCard(container, t, o = {}) {
      const w = add(container, { left: "6%", right: "6%", top: "50%", transform: "translateY(-50%)", textAlign: "center" });
      const Lh = sub(w, { font: "900 " + px(132, o) + "/1 " + F_DISP, color: TXT, textShadow: "0 0 " + px(40, o) + " " + GLOW + ", " + SH(o) }, o.line);
      const C = o.cta && sub(w, { display: "inline-block", position: "relative", font: "italic 400 " + px(64, o) + " " + F_SERIF, color: TXT, marginTop: px(26, o), textShadow: SH(o) }, o.cta);
      const H = o.handle && sub(w, { font: "600 " + px(34, o) + " " + F_DISP, color: TXT, opacity: 0.9, marginTop: px(18, o), textShadow: SH(o) }, o.handle);
      text(Lh, t, o.style || "stretch", { sfx: false });
      cue(t, "pop", "end card", o.sfx);
      if (C) { text(C, t + 0.45, "blur", { sfx: false });
        const u = document.createElement("div"); Object.assign(u.style, { position: "absolute", left: 0, right: 0, bottom: "-" + px(6, o), height: px(5, o), borderRadius: px(3, o), background: ACC, boxShadow: "0 0 " + px(14, o) + " " + GLOW, transformOrigin: "0 50%" });
        C.appendChild(u); tl.fromTo(u, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.inOut" }, t + 0.8); cue(t + 0.8, "swipe", "cta underline", o.sfx); }
      if (H) text(H, t + 1.0, "rise", { sfx: false });
      return w;
    }

    // quote(container, t, {text, by}) - big serif quote mark, words blur in, attribution rises
    function quote(container, t, o = {}) {
      const w = add(container, { left: "10%", right: "10%", top: "50%", transform: "translateY(-50%)", textAlign: "center" });
      const M = sub(w, { font: "italic 400 " + px(240, o) + "/0.6 " + F_SERIF, color: ACC, textShadow: "0 0 " + px(30, o) + " " + GLOW, height: px(110, o) }, "“");
      const Q = sub(w, { font: "italic 400 " + px(76, o) + "/1.15 " + F_SERIF, color: TXT, textShadow: SH(o) }, o.text);
      const B = o.by && sub(w, { font: "600 " + px(32, o) + " " + F_DISP, color: MUTED, marginTop: px(28, o), textShadow: SH(o) }, o.by);
      tl.fromTo(M, { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }, t);
      const e = text(Q, t + 0.2, "blur", { sfx: false, each: o.each || 0.09 });
      if (B) text(B, e, "rise", { sfx: false });
      cue(t, o.cue || "shimmer", "quote", o.sfx);
      return w;
    }

    // steps(container, t, ["Hook", "Story", "Offer"], {each}) - numbered list, one item every `each` seconds
    function steps(container, t, items, o = {}) {
      const w = add(container, { left: o.left || "8%", top: o.top || "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: px(26, o) });
      items.forEach((s, i) => {
        const row = document.createElement("div"); Object.assign(row.style, { display: "flex", alignItems: "baseline", gap: px(26, o) }); w.appendChild(row);
        const n = sub(row, { font: "italic 400 " + px(84, o) + "/1 " + F_SERIF, color: ACC, textShadow: "0 0 " + px(20, o) + " " + GLOW, minWidth: px(60, o) }, String(i + 1));
        const tx = sub(row, { font: "800 " + px(64, o) + "/1.05 " + F_DISP, color: TXT, textShadow: SH(o) }, s);
        const at = t + i * (o.each || 0.6);
        tl.fromTo(n, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(3)" }, at);
        text(tx, at + 0.08, "rise", { sfx: false });
        cue(at, "pop", "step " + (i + 1), o.sfx);
      });
      return w;
    }

    return { shake, text, textOut, impact, split, screen, zoom, cursor, carousel, orbit, parallax, fan, bg, bgSwitch, lightLeak,
      map, count, bars, ring, line, onBeats, beatShake, beatFlash, title, lowerThird, callout, transition, endCard, quote, steps, cues,
      transitions: Object.keys(TRANS), presets: ["title", "lowerThird", "callout", "transition", "endCard", "quote", "steps"],
      shakes: Object.keys(SHAKES), styles: Object.keys(TEXT), outs: Object.keys(OUT), screens: Object.keys(SCREEN), bgs: BGS,
      cuesJSON: (gap = 0.15) => JSON.stringify(mergeCues(cues, gap)) };
  };
})();
