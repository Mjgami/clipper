/* CreatorFX: creator-YouTube effects for the Claude Motion Kit (HyperFrames + GSAP).
 * Distilled from a real 4-part creator video edit. Load after motionkit.js:
 *   <script src="creatorfx.js"></script>  <link rel="stylesheet" href="creatorfx.css" />
 *   const CF = CreatorFX(tl, { root: "#root" });
 * Every helper only adds tweens to the ONE paused timeline, so renders stay frame-exact and seek-safe.
 * DOM is built once at load time (before the timeline plays), never inside tweens.
 */
(function () {
  window.CreatorFX = function (tl, opts = {}) {
    const fps = opts.fps || 30;
    const R = typeof opts.root === "string" ? document.querySelector(opts.root) : opts.root || document.body;
    const $ = (s) => (typeof s === "string" ? document.querySelector(s) : s);
    const GLY = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+/<>";
    let uid = 0;

    /* ---------- entrances ---------- */
    // Soft rise: cards, posts, panels.
    const rise = (sel, t, d = 0.42) => tl.fromTo(sel, { opacity: 0, y: 50, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: d, ease: "expo.out", immediateRender: false }, t);
    const fall = (sel, t) => tl.to(sel, { opacity: 0, y: -24, filter: "blur(8px)", duration: 0.22, ease: "power2.in" }, t);

    /* ---------- decoder text ----------
     * <div class="mk-big cf-dec" id="hero">AI EDITED</div>   CF.decode("#hero", 0.45)
     * Each letter scrambles through glyphs, then locks in left to right. Deterministic (no Math.random).
     * Call it again later on the same element to re-decode it.
     */
    const decoded = new Map();
    function prepDecode(sel) {
      const el = $(sel);
      if (decoded.has(el)) return decoded.get(el);
      const text = el.textContent;
      el.textContent = "";
      const cells = [];
      [...text].forEach((ch) => {
        if (ch === " ") { const s = document.createElement("span"); s.className = "cf-dsp"; el.appendChild(s); return; }
        const c = document.createElement("span"); c.className = "cf-dc";
        const k = document.createElement("span"); k.className = "cf-dk"; k.textContent = ch;
        const g = document.createElement("span"); g.className = "cf-ds"; g.setAttribute("data-layout-allow-overlap", "");
        c.appendChild(k); c.appendChild(g); el.appendChild(c); cells.push([k, g]);
      });
      el.style.opacity = 1;
      decoded.set(el, cells);
      return cells;
    }
    function decode(sel, t, o = {}) {
      const cells = prepDecode(sel), stagger = o.stagger || 0.045, steps = o.steps || 9;
      cells.forEach(([k, g], i) => {
        tl.set(k, { opacity: 0 }, Math.max(0, t - 0.001));
        const t0 = t + i * stagger;
        for (let s = 0; s < steps; s++) tl.set(g, { textContent: GLY[(i * 7 + s * 13 + 3) % GLY.length], opacity: 0.35 + 0.07 * s }, t0 + s / fps);
        const lock = t0 + steps / fps;
        tl.set(g, { textContent: "", opacity: 0 }, lock);
        tl.fromTo(k, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power1.out", immediateRender: false }, lock);
      });
      return t + cells.length * stagger + steps / fps; // time the word is fully locked
    }

    /* ---------- metallic shimmer sweep (gold / silver text) ----------
     * <span class="cf-gold">GOLDEN</span>  CF.shimmer(".cf-gold", 15.3)
     */
    const shimmer = (sel, t, d = 1.1) => tl.fromTo(sel, { backgroundPosition: "100% 0%" }, { backgroundPosition: "0% 0%", duration: d, ease: "power2.inOut", immediateRender: false }, t);

    /* ---------- hero folder (Apple-style, code-built) ----------
     * A recurring "hero object" for the thing the video sells (a kit, a course, a template pack).
     * const f = CF.folder({ id: "f1", x: 160, y: 560, scale: 1, label: "My Kit", papers: ["YouTube","SaaS","Vox","Reels"], tone: "gold" });
     * rise("#f1", t);  CF.openFolder("f1", t + 0.3);
     * tone: gold (only when the script literally says gold/golden) | blue | graphite
     */
    const TONES = {
      gold: { back: ["#e2ab42", "#9c6a12"], front: ["#ffe390", "#f4c457", "#d5952a"], star: ["#b97f1c", "#ffefb8", "#e9b446"], glow: "255,200,80" },
      blue: { back: ["#4aa8e8", "#1b4f86"], front: ["#bfe6ff", "#6cc0f5", "#2f86c9"], star: ["#1e5f99", "#e6f6ff", "#59b2ec"], glow: "90,180,255" },
      graphite: { back: ["#4b5260", "#22262e"], front: ["#9aa3b2", "#6c7483", "#454c58"], star: ["#2b3038", "#e8ecf2", "#7b8494"], glow: "200,210,230" },
    };
    function folder(o) {
      uid++;
      const g = "cfg" + uid, T = TONES[o.tone || "gold"], papers = o.papers || [];
      const el = document.createElement("div");
      el.className = "cf-fold"; el.id = o.id;
      el.style.left = (o.x || 0) + "px"; el.style.top = (o.y || 0) + "px";
      el.style.setProperty("--cf-fold-glow", T.glow);
      el.innerHTML = `
        <div class="cf-rays" id="${o.id}-rays"></div><div class="cf-glow" id="${o.id}-glow"></div>
        <div class="cf-fwrap">
          <svg viewBox="0 0 360 300"><defs>
            <linearGradient id="${g}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.back[0]}"/><stop offset="1" stop-color="${T.back[1]}"/></linearGradient>
          </defs>
            <path d="M20 46a22 22 0 0 1 22-22h86c9 0 15 4 20 11l10 13h160a22 22 0 0 1 22 22v186a22 22 0 0 1-22 22H42a22 22 0 0 1-22-22z" fill="url(#${g}b)"/>
          </svg>
          <div class="cf-papers" data-layout-allow-overlap data-layout-allow-occlusion>${papers.map((p, i) => `<div class="cf-paper" data-layout-allow-overlap data-layout-allow-occlusion id="${o.id}-p${i}"><i></i>${p}</div>`).join("")}</div>
          <div class="cf-front" id="${o.id}-front">
            <svg viewBox="0 0 360 300"><defs>
              <linearGradient id="${g}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.front[0]}"/><stop offset=".45" stop-color="${T.front[1]}"/><stop offset="1" stop-color="${T.front[2]}"/></linearGradient>
              <linearGradient id="${g}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".35" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
            </defs>
              <rect x="20" y="82" width="320" height="196" rx="20" fill="url(#${g}f)"/>
              <rect x="20" y="82" width="320" height="196" rx="20" fill="url(#${g}s)"/>
              <path d="M40 83.5h280" stroke="#ffffff" stroke-opacity=".85" stroke-width="2.5" stroke-linecap="round"/>
              <path d="M180 140l9 22 22 9-22 9-9 22-9-22-22-9 22-9z" fill="${T.star[0]}" opacity=".55" transform="translate(0 1.6)"/>
              <path d="M180 140l9 22 22 9-22 9-9 22-9-22-22-9 22-9z" fill="${T.star[1]}" opacity=".75" transform="translate(0 -1.2)"/>
              <path d="M180 140l9 22 22 9-22 9-9 22-9-22-22-9 22-9z" fill="${T.star[2]}"/>
            </svg>
          </div>
        </div>
        ${o.label ? `<div class="cf-lbl"><span>${o.label}</span></div>` : ""}`;
      (o.parent ? $(o.parent) : R).appendChild(el);
      gsap.set(el, { scale: o.scale || 1, transformOrigin: "50% 50%" });
      el._papers = papers.length;
      return el;
    }
    function openFolder(id, t, rise = 70) {
      const n = $("#" + id)._papers || 0;
      tl.fromTo(`#${id}-glow`, { opacity: 0 }, { opacity: 1, duration: 0.4, immediateRender: false }, t);
      tl.to(`#${id}-front`, { rotationX: -26, transformPerspective: 900, duration: 0.45, ease: "back.out(1.6)" }, t);
      for (let i = 0; i < n; i++) {
        const c = i - (n - 1) / 2;
        tl.fromTo(`#${id}-p${i}`, { y: 40, x: 0, rotation: 0 }, { y: -rise - i * 6, x: c * 22, rotation: c * 5, duration: 0.5, ease: "back.out(1.8)", immediateRender: false }, t + 0.06 + i * 0.07);
      }
    }

    /* ---------- picture-in-picture ----------
     * The speaker shrinks into a corner while a showcase plays behind, then expands back.
     * Wrap the camera: <div id="camWrap"><div class="mk-cam" id="cam">...video...</div></div>
     * CF.pipIn({ wrap: "#camWrap", t: 6.3, stage: "#stage", ring: "#pipRing" }); CF.pipOut({ ...same, t: 10.4 });
     * Default corner = bottom-right, 26% size. Keep the PiP clear of any text.
     */
    function pipIn(o) {
      const s = o.scale || 0.26, m = o.margin == null ? 60 : o.margin;
      tl.set(o.wrap, { transformOrigin: o.origin || "100% 100%" }, Math.max(0, o.t - 0.001));
      tl.to(o.wrap, { scale: s, x: -m, y: -m, borderRadius: (o.radius || 62), duration: 0.5, ease: "expo.inOut" }, o.t);
      if (o.stage) tl.to(o.stage, { opacity: 1, duration: 0.3, ease: "power1.out" }, o.t + 0.05);
      if (o.ring) tl.fromTo(o.ring, { opacity: 0 }, { opacity: 1, duration: 0.2, immediateRender: false }, o.t + 0.42);
    }
    function pipOut(o) {
      if (o.ring) tl.to(o.ring, { opacity: 0, duration: 0.1 }, o.t);
      tl.to(o.wrap, { scale: 1, x: 0, y: 0, borderRadius: 0, duration: 0.45, ease: "expo.inOut" }, o.t);
      if (o.stage) tl.to(o.stage, { opacity: 0, duration: 0.25 }, o.t + 0.25);
    }

    /* ---------- camera box (light studio layout) ----------
     * The full-frame speaker eases into a tall rounded box on one side, leaving the other side for
     * screen recordings or graphics, then back. Uses clip-path, so nothing is re-scaled or blurred.
     * CF.camBox({ wrap: "#camWrap", t: 6, box: { x: 1090, y: 70, w: 760, h: 940, r: 36 } });
     * CF.camFull({ wrap: "#camWrap", t: 34 });
     */
    const full = "inset(0px 0px 0px 0px round 0px)";
    function camBox(o) {
      const b = o.box, W = o.W || 1920, H = o.H || 1080;
      const to = `inset(${b.y}px ${W - b.x - b.w}px ${H - b.y - b.h}px ${b.x}px round ${b.r || 36}px)`;
      tl.fromTo(o.wrap, { clipPath: full }, { clipPath: to, duration: o.dur || 0.6, ease: "expo.inOut", immediateRender: false }, o.t);
      if (o.ring) tl.fromTo(o.ring, { opacity: 0 }, { opacity: 1, duration: 0.25, immediateRender: false }, o.t + 0.45);
      return to;
    }
    function camFull(o) {
      if (o.ring) tl.to(o.ring, { opacity: 0, duration: 0.12 }, o.t);
      tl.to(o.wrap, { clipPath: full, duration: o.dur || 0.55, ease: "expo.inOut" }, o.t);
    }
    // Soft blobs + dot grid behind graphics. Light (default): CF.lightStage("#bg", null, dur)
    // Dark showcase stage: CF.lightStage("#bg", ["#1b2440","#22183a","#0f2a33","#18203a"], dur, "#0b0d12")
    function lightStage(sel, colors, dur, base) {
      const el = $(sel);
      const spots = [[-160, -200, 820, 720], [1150, -260, 900, 760], [560, 640, 1000, 700], [-260, 640, 700, 600]];
      el.classList.add("cf-light");
      if (base) { el.classList.add("cf-dark-stage"); el.style.background = base; }
      (colors || ["#ffd6c2", "#dcd6ff", "#cdeeff", "#fff0c9"]).forEach((c, i) => {
        const [l, t, w, h] = spots[i % 4];
        const b = document.createElement("div"); b.className = "cf-blob"; b.id = el.id + "-b" + i; b.setAttribute("data-layout-allow-overflow", "");
        Object.assign(b.style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px", background: c });
        el.appendChild(b);
        if (dur) tl.fromTo(b, { x: 0, y: 0 }, { x: (i % 2 ? -1 : 1) * 80, y: (i < 2 ? 1 : -1) * 60, duration: dur, ease: "sine.inOut", immediateRender: false }, 0);
      });
    }

    /* ---------- social proof post (X / Threads style) ----------
     * Use REAL posts the user chose (real name, handle, avatar, quote) and keep the handle visible.
     * CF.post("#posts", { id: "p1", name: "Jane", handle: "@jane", avatar: "ex/av_jane.jpg", text: "This took 15 minutes", x: 110, y: 300 });
     */
    function post(parent, o) {
      const el = document.createElement("div");
      el.className = "cf-post" + (o.light ? " cf-post-light" : ""); el.id = o.id;
      Object.assign(el.style, { left: (o.x || 0) + "px", top: (o.y || 0) + "px", width: (o.w || 520) + "px" });
      el.innerHTML = `${o.avatar ? `<img class="cf-av" src="${o.avatar}" alt="" />` : `<div class="cf-av cf-av-i">${(o.name || "?")[0]}</div>`}
        <div><div class="cf-h">${o.name || ""}<b>${o.handle || ""}</b></div><div class="cf-t">${o.text || ""}</div></div>`;
      $(parent).appendChild(el);
      return el;
    }

    /* ---------- chat (WhatsApp style) ----------
     * Real-UI beat instead of a text card ("the client asks for changes").
     * CF.chat("#root", { id: "wa", x: 110, y: 150, name: "John (Client)", avatar: "ex/john.jpg",
     *   messages: [{ me: true, text: "Here's the final video ✅", time: "2:58 PM", t: 60.8 },
     *              { text: "Change the text 🙏", time: "3:00 PM", t: 64.9, typing: 1.2 }] }, 60.3);
     * `typing` shows the typing dots for that many seconds before the message.
     */
    function chat(parent, o, t) {
      const el = document.createElement("div");
      el.className = "cf-chat"; el.id = o.id;
      Object.assign(el.style, { left: (o.x || 0) + "px", top: (o.y || 0) + "px" });
      const msgs = o.messages || [];
      el.innerHTML = `<div class="cf-chd"><svg width="16" height="26" viewBox="0 0 16 26"><path d="M13 2L3 13l10 11" stroke="#e9edef" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          ${o.avatar ? `<img src="${o.avatar}" alt="" />` : `<div class="cf-cav">${(o.name || "?")[0]}</div>`}<div><div class="cf-cnm">${o.name || ""}</div><div class="cf-cst" id="${o.id}-st">online</div></div></div>
        <div class="cf-cbd" id="${o.id}-bd">${msgs.map((m, i) => (m.typing ? `<div class="cf-typ" id="${o.id}-ty${i}"><b></b><b></b><b></b></div>` : "") +
          `<div class="cf-bub ${m.me ? "cf-out" : "cf-in"}" id="${o.id}-m${i}">${m.text}<small>${m.time || ""}${m.me ? " <i>✓✓</i>" : ""}</small></div>`).join("")}</div>`;
      $(parent).appendChild(el);
      if (t != null) rise(el, t, 0.45);
      msgs.forEach((m, i) => {
        if (m.typing) {
          const ty = `#${o.id}-ty${i}`, a = m.t - m.typing;
          tl.fromTo(ty, { opacity: 0, display: "flex" }, { opacity: 1, duration: 0.15, immediateRender: false }, a);
          tl.set(`#${o.id}-st`, { textContent: "typing…" }, a);
          [0, 1, 2].forEach((k) => tl.fromTo(`${ty} b:nth-child(${k + 1})`, { y: 0 }, { y: -6, duration: 0.18, yoyo: true, repeat: Math.max(1, Math.floor(m.typing / 0.36)), ease: "sine.inOut", immediateRender: false }, a + k * 0.1));
          tl.set(ty, { display: "none" }, m.t - 0.02);
          tl.set(`#${o.id}-st`, { textContent: "online" }, m.t);
        }
        tl.fromTo(`#${o.id}-m${i}`, { opacity: 0, y: 24, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(1.8)", immediateRender: false }, m.t);
      });
      return el;
    }

    /* ---------- glass progress bar (Start -> End) ----------
     * CF.progress("#bar", 34.76, 0.96)  (markup: .cf-bar > .cf-track + .cf-fill + .cf-head)
     */
    function progress(sel, t, d = 1) {
      tl.fromTo(`${sel} .cf-fill`, { scaleX: 0 }, { scaleX: 1, duration: d, ease: "power2.inOut", immediateRender: false }, t);
      tl.fromTo(`${sel} .cf-head`, { left: "0%" }, { left: "100%", duration: d, ease: "power2.inOut", immediateRender: false }, t);
    }

    return { rise, fall, prepDecode, decode, shimmer, folder, openFolder, pipIn, pipOut, camBox, camFull, lightStage, post, chat, progress };
  };
})();
