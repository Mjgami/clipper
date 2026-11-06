/* MotionKit runtime: shared, seek-safe helpers for HyperFrames compositions.
 * Every helper adds tweens to ONE paused GSAP timeline, so renders are deterministic.
 * Usage:
 *   const tl = gsap.timeline({ paused: true });
 *   const MK = MotionKit(tl, { fps: 30 });
 *   MK.captions({ words, container: "#caps", end: 19.2 });
 *   window.__timelines["main"] = tl;
 */
(function () {
  const STOP = new Set(["a", "an", "the", "and", "or", "but", "for", "of", "in", "on", "at", "to", "is", "are", "was", "be", "i", "i'm", "i'll", "we're", "that's", "it's", "will", "just", "not", "how", "when", "what", "your", "my", "our", "this", "that", "doing", "making", "sure", "so", "very", "with", "you", "we", "they", "he", "she", "it", "do", "can", "gonna"]);
  const NEG = new Set(["hope", "pray", "waiting", "never", "wrong", "fail", "failed", "lose", "losing", "lost", "stop", "problem", "broke", "weeks", "months", "slow"]);
  const clean = (w) => w.replace(/[.,!?;:]+$/, "");

  window.MotionKit = function (tl, opts = {}) {
    const fps = opts.fps || 30;
    const $ = (s) => (typeof s === "string" ? document.querySelector(s) : s);

    /* ---------- text ---------- */
    // Serif-italic lead line, one word at a time: lead("#lead1", [["What",0.2],["if",0.5]])
    function lead(sel, words) {
      const el = $(sel);
      words.forEach(([w, t], i) => {
        const s = document.createElement("span");
        s.id = el.id + "w" + i; s.textContent = w; el.appendChild(s);
        tl.fromTo(s, { opacity: 0, y: 22, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.22, ease: "power2.out" }, t);
      });
    }
    // Big key word pop (scale + blur), optional overrides for the "from" state
    const popIn = (sel, t, from = {}) => tl.fromTo(sel, { opacity: 0, scale: 0.7, filter: "blur(12px)", ...from }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.28, ease: "back.out(2)" }, t);
    // Hit-style entrance for hero words (scale down from big)
    const slam = (sel, t) => tl.fromTo(sel, { opacity: 0, scale: 1.25, filter: "blur(14px)" }, { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.3, ease: "power3.out" }, t);
    const blurRise = (sel, t) => tl.fromTo(sel, { opacity: 0, y: 30, filter: "blur(12px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.3, ease: "power3.out" }, t);
    const out = (sel, t, d = 0.16) => tl.to(sel, { opacity: 0, y: -24, filter: "blur(10px)", duration: d, ease: "power2.in" }, t);
    // Strike-through line drawn left to right (element must have transform-origin: 0 50%)
    const strike = (sel, t, d = 0.2) => tl.fromTo(sel, { scaleX: 0 }, { scaleX: 1, duration: d, ease: "power2.inOut", immediateRender: true }, t);
    // Typewriter into an element: type("#ptyped", "make a 15s ad", 0.35, 0.045)
    function type(sel, text, t, perChar = 0.045) {
      for (let i = 0; i <= text.length; i++) tl.set(sel, { textContent: text.slice(0, i) }, t + i * perChar);
      return t + text.length * perChar;
    }
    function blink(sel, t, times = 4, period = 0.25) {
      for (let k = 0; k < times; k++) { tl.set(sel, { opacity: 0 }, t + k * period); tl.set(sel, { opacity: 1 }, t + k * period + period / 2); }
    }

    /* ---------- kinetic captions ----------
     * words: [[text,start,end],...]; one phrase = up to `max` words or until punctuation.
     * One key word per phrase is set big (auto: longest non-stopword, numbers win) unless `keys` (Set of indices) is given.
     * hide: [[a,b],...] windows where captions are hidden (a giant word owns the frame).
     */
    function captions({ words, container = "#caps", end, keys = null, hide = [], max = 3, neg = NEG }) {
      const box = $(container);
      const chunks = []; let cur = [];
      words.forEach((w, i) => { cur.push(i); if (/[.,!?]$/.test(w[0]) || cur.length === max) { chunks.push(cur); cur = []; } });
      if (cur.length) chunks.push(cur);
      chunks.forEach((idxs, ci) => {
        let key = -1;
        if (keys) idxs.forEach((i) => { if (keys.has(i)) key = i; });
        else {
          let best = 0;
          idxs.forEach((i) => { const w = clean(words[i][0]).toLowerCase(); const sc = STOP.has(w) ? 0 : w.length + (/\d/.test(w) ? 6 : 0); if (sc > best) { best = sc; key = i; } });
        }
        const d = document.createElement("div"); d.className = "mk-cap"; d.id = "mkcap" + ci;
        d.innerHTML = idxs.map((i) => {
          const w = clean(words[i][0]); const isKey = keys ? keys.has(i) : i === key;
          const cls = "mk-cw" + (isKey ? " key" + (neg.has(w.toLowerCase()) ? " neg" : "") : "");
          return '<span class="' + cls + '" id="mkcw' + i + '">' + w + "</span>";
        }).join("");
        box.appendChild(d);
        const a = words[idxs[0]][1];
        const b = ci + 1 < chunks.length ? words[chunks[ci + 1][0]][1] : end;
        idxs.forEach((i) => {
          const isKey = d.querySelector("#mkcw" + i).classList.contains("key");
          tl.fromTo("#mkcw" + i, isKey ? { opacity: 0, scale: 0.7, filter: "blur(10px)" } : { opacity: 0, y: 20, filter: "blur(8px)" },
            isKey ? { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.26, ease: "back.out(2)" } : { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.2, ease: "power2.out" }, words[i][1]);
        });
        if (ci + 1 < chunks.length) tl.to("#mkcap" + ci, { opacity: 0, y: -14, filter: "blur(6px)", duration: 0.12, ease: "power2.in" }, b - 0.12);
        hide.forEach(([h0, h1]) => { if (h1 > a && h0 < b) { tl.set(container, { opacity: 0 }, Math.max(h0, a)); tl.set(container, { opacity: 1 }, Math.min(h1, b)); } });
      });
      return chunks;
    }

    /* ---------- camera ----------
     * steps: [{t, scale, origin, push?:{to, dur}}]  hard cuts between framings, optional slow push after each.
     * Hard punch-ins read as jump cuts on a talking head: prefer zoom() unless the user asks for punchy cuts.
     */
    /* ---------- smooth zoom (house default for talking heads) ----------
     * zoom("#cam", t, {to: 1.1, origin: "50% 32%", inDur: 0.7, hold: 1.6, outDur: 0.8})
     * Eased push in on an impact line, hold, ease back out. No hard jump cuts. Use a handful per minute.
     */
    function zoom(sel, t, o = {}) {
      const to = o.to || 1.1, from = o.from || 1, inDur = o.inDur || 0.7, hold = o.hold == null ? 1.5 : o.hold, outDur = o.outDur || 0.8;
      tl.set(sel, { transformOrigin: o.origin || "50% 32%" }, t);
      tl.fromTo(sel, { scale: from }, { scale: to, duration: inDur, ease: "power2.inOut", immediateRender: false }, t);
      if (hold >= 0 && !o.stay) tl.to(sel, { scale: from, duration: outDur, ease: "power2.inOut" }, t + inDur + hold);
    }

    function camera(sel, steps) {
      steps.forEach((s) => {
        tl.set(sel, { scale: s.scale, transformOrigin: s.origin || "50% 40%" }, s.t);
        if (s.push) tl.fromTo(sel, { scale: s.scale }, { scale: s.push.to, duration: s.push.dur, ease: "sine.inOut", immediateRender: false }, s.t + 0.02);
      });
    }

    /* ---------- cards, chips, ticks ---------- */
    const cardIn = (sel, t, fromX = 60) => tl.fromTo(sel, { opacity: 0, x: fromX, scale: 0.92, rotationY: fromX > 0 ? -14 : 14 }, { opacity: 1, x: 0, scale: 1, rotationY: 0, duration: 0.45, ease: "expo.out", transformPerspective: 1000 }, t);
    const cardOut = (sel, t, toX = 60) => tl.to(sel, { opacity: 0, x: toX, duration: 0.22, ease: "power2.in" }, t);
    const chipIn = (sel, t) => tl.fromTo(sel, { opacity: 0, y: 24, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "back.out(1.8)" }, t);
    // Draw an SVG stroke (path/circle) on: draw("#tick1", t, 0.22, 30)
    const draw = (sel, t, d = 0.25, len = 300) => tl.fromTo(sel, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: d, ease: "power2.out" }, t);
    const pop = (sel, t, s = 0.3) => tl.fromTo(sel, { opacity: 0, scale: s }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2.5)" }, t);

    /* ---------- numbers ---------- */
    function counter(sel, from, to, t, dur = 1.4, fmt = (v) => Math.round(v).toLocaleString("en-US")) {
      // baked frame by frame (no onUpdate): renders correctly even when the engine seeks with callbacks suppressed
      const el = $(sel), ease = gsap.parseEase("power3.out"), n = Math.max(1, Math.round(dur * fps));
      el.textContent = fmt(from);
      for (let i = 0; i <= n; i++) tl.set(el, { textContent: fmt(from + (to - from) * ease(i / n)) }, t + (i * dur) / n);
    }

    /* ---------- texture ---------- */
    // Film grain: element with a tiled noise background, jittered every 2 frames (deterministic)
    function grain(sel, dur) {
      for (let f = 0, t = 0; t < dur; f++, t += 2 / fps) tl.set(sel, { x: ((f * 97) % 60) - 30, y: ((f * 53) % 60) - 30 }, t);
    }
    const flash = (sel, t, peak = 0.4) => tl.fromTo(sel, { opacity: peak }, { opacity: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, t);
    // Slow drifting glow blobs
    const drift = (sel, dx, dy, dur) => tl.fromTo(sel, { x: 0, y: 0 }, { x: dx, y: dy, duration: dur, ease: "sine.inOut" }, 0);

    /* ---------- 3D UI ---------- */
    const tiltIn = (sel, t) => tl.fromTo(sel, { opacity: 0, rotationX: 30, rotationY: -22, z: -420, x: 120 }, { opacity: 1, rotationX: 0, rotationY: 0, z: 0, x: 0, duration: 0.8, ease: "expo.out" }, t);
    const zoomThrough = (sel, t) => tl.to(sel, { scale: 2.6, opacity: 0, filter: "blur(18px)", duration: 0.22, ease: "power3.in" }, t);
    // Cursor glide + click with ripple
    function click(cursorSel, rippleSel, targetSel, t, move = { x: 0, y: 0 }, travel = 0.6) {
      tl.fromTo(cursorSel, { opacity: 0, x: 0, y: 0 }, { opacity: 1, duration: 0.15 }, t - travel - 0.1);
      tl.to(cursorSel, { x: move.x, y: move.y, duration: travel, ease: "power3.inOut" }, t - travel);
      tl.to(cursorSel, { scale: 0.82, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.out" }, t);
      if (targetSel) tl.to(targetSel, { scale: 0.92, duration: 0.07, yoyo: true, repeat: 1 }, t);
      if (rippleSel) tl.fromTo(rippleSel, { opacity: 0.9, scale: 0.3 }, { opacity: 0, scale: 2.4, duration: 0.45, ease: "power2.out", immediateRender: false }, t);
      tl.to(cursorSel, { opacity: 0, duration: 0.15 }, t + 0.3);
    }

    return { zoom, lead, popIn, slam, blurRise, out, strike, type, blink, captions, camera, cardIn, cardOut, chipIn, draw, pop, counter, grain, flash, drift, tiltIn, zoomThrough, click };
  };
})();
