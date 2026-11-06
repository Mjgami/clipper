"""picker.py <project> <clip-number>
Builds <project>/style-picker.html: a clickable page with the 15 styles rendered on the user's own frame
(from style_board.py) + a Personalize form. Clicking a card shows a ready prompt with a Copy button;
the user pastes it back into Claude to start the edit. Self-contained (images embedded), opens in any browser.
"""
import base64, glob, html, io, json, os, sys
from PIL import Image

proj, n = sys.argv[1], int(sys.argv[2])
clip = json.load(open(os.path.join(proj, "cuts.json")))[n - 1]
STYLES = [
    ("Bold Hook", "Hormozi-style: full-frame speaker, huge uppercase words with a yellow key word and black outline, smooth push-ins on punchlines, word pops."),
    ("Clean Creator", "Ali Abdaal-style: soft bright grade, serif italic lead words + one bold key word, glass side cards, checklists, gentle zooms."),
    ("Podcast Clip", "Speaker in a rounded card over a blurred copy of the shot, clean two-line captions under it, live waveform bar, name tag."),
    ("Cinematic Trailer", "Letterbox bars, filmic grade, sparse serif titles, slow drifts and flash cuts between beats."),
    ("Vlog Story", "Warm grade, handwritten-feel captions, date/location tag, doodle arrows and photo cards."),
    ("Luxury Minimal", "Gadzhi-style: black & white, lots of space, small lowercase serif captions, very slow push-ins."),
    ("Documentary Explainer", "Vox-style: paper/cutout cards, marker highlights on key words, maps and archival-style cards, push transitions."),
    ("Tech / SaaS Explainer", "Dark UI, glass panels, real app/UI recreations, cursor clicks, 3D screens, gradient key word."),
    ("Data Story", "Numbers lead: big counters, bar and line charts drawing on, short labels (only real numbers from the video)."),
    ("Kinetic Type", "Text-led: bold word stacks on the chest under the chin, beat-synced word slams, speaker dimmed slightly."),
    ("Boxed Story", "Signature: speaker's horizontal shot in a framed box, real UI (phone feed, chats, cards) beside it, boxed uppercase captions, smooth vertical-to-box moves."),
    ("Meme / Comedy", "Punchy: impact font with black outline, sticker pops, reaction cutaways, playful punch-ins."),
    ("Motivational Impact", "High contrast, stacked giant words on the chest, flashes and glitch hits on the key lines."),
    ("Minimal Subtitles", "Just the speaker: one clean caption line under the chin, no graphics."),
    ("Breaking News", "Newsroom headline bar + ticker under the chin, breaking flash on the hook."),
]


def thumb(path):
    im = Image.open(path).convert("RGB").resize((360, 640))
    b = io.BytesIO(); im.save(b, "JPEG", quality=82)
    return "data:image/jpeg;base64," + base64.b64encode(b.getvalue()).decode()


cards = []
for i, (name, look) in enumerate(STYLES, 1):
    p = glob.glob(os.path.join(proj, "style-board", f"{i:02d} *.png"))
    img = thumb(p[0]) if p else ""
    prompt = (f"MASH Clipper: edit clip {n} \"{clip['name']}\" in style #{i} {name}. "
              f"Look: {look} Follow the MASH Clipper editing rules (nothing on the face, captions on the chest under the chin, "
              f"exact words only, original audio). Show me the PNG storyboard first.")
    cards.append({"n": i, "name": name, "look": look, "img": img, "prompt": prompt})

data = json.dumps(cards)
clipname = html.escape(clip["name"])
page = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pick a style</title><style>
:root{{--bg:#0E0E10;--card:#18181B;--line:#2A2A2E;--text:#F4F4F5;--muted:#A1A1AA;--accent:#FFD60A}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--bg);color:var(--text);font:15px/1.45 -apple-system,"Segoe UI",Inter,Helvetica,Arial,sans-serif}}
header{{padding:28px 20px 8px;max-width:1240px;margin:auto}}h1{{margin:0 0 4px;font-size:26px}}header p{{margin:0;color:var(--muted)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;padding:16px 20px 160px;max-width:1240px;margin:auto}}
.c{{background:var(--card);border:2px solid var(--line);border-radius:14px;overflow:hidden;cursor:pointer;transition:transform .15s,border-color .15s}}
.c:hover{{transform:translateY(-3px)}}.c.on{{border-color:var(--accent)}}
.c img{{display:block;width:100%;aspect-ratio:9/16;object-fit:cover;background:#000}}
.c b{{display:block;padding:10px 12px 2px}}.c span{{display:block;padding:0 12px 12px;color:var(--muted);font-size:12.5px}}
.p{{display:flex;flex-direction:column;justify-content:center;align-items:center;aspect-ratio:9/16;background:linear-gradient(160deg,#26262B,#141416);font-size:44px}}
.bar{{position:fixed;left:0;right:0;bottom:0;background:#131316ee;backdrop-filter:blur(10px);border-top:1px solid var(--line);padding:14px 20px}}
.bar .in{{max-width:1240px;margin:auto;display:flex;gap:12px;align-items:flex-start}}
textarea{{flex:1;min-height:70px;background:#0B0B0D;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:10px;font:13px/1.4 ui-monospace,Menlo,monospace;resize:vertical}}
button{{background:var(--accent);color:#111;border:0;border-radius:10px;padding:12px 18px;font-weight:700;cursor:pointer;white-space:nowrap}}
form{{display:none;padding:10px 12px 14px;gap:8px;flex-direction:column}}.on form{{display:flex}}
input,select{{background:#0B0B0D;color:var(--text);border:1px solid var(--line);border-radius:8px;padding:8px;font-size:13px}}
@media (max-width:600px){{.grid{{grid-template-columns:repeat(2,1fr)}}.bar .in{{flex-direction:column}}button{{width:100%}}}}
</style></head><body>
<header><h1>Pick a style for clip {n}: “{clipname}”</h1><p>Every style below is your own clip. Click one, then press <b>Copy prompt</b> and paste it back into Claude.</p></header>
<div class="grid" id="g"></div>
<div class="bar"><div class="in"><textarea id="t" readonly placeholder="Click a style above…"></textarea><button id="cp">Copy prompt</button></div></div>
<script>
const S={data}; const g=document.getElementById("g"), t=document.getElementById("t");
function pick(el,txt){{document.querySelectorAll(".c").forEach(c=>c.classList.remove("on"));el.classList.add("on");t.value=txt;}}
S.forEach(s=>{{const d=document.createElement("div");d.className="c";d.innerHTML=`<img src="${{s.img}}" alt=""><b>${{s.n}}. ${{s.name}}</b><span>${{s.look}}</span>`;d.onclick=()=>pick(d,s.prompt);g.appendChild(d);}});
const p=document.createElement("div");p.className="c";
p.innerHTML=`<div class="p">✦<div style="font-size:15px;margin-top:8px">Your brand</div></div><b>16. Personalize</b><span>Your colours, fonts, captions and amount of graphics.</span>
<form onsubmit="return false"><input id="pc" placeholder="Colours (hex) or 'from my footage'"><input id="pf" placeholder="Fonts or 'pick for me'">
<select id="pk"><option>Boxed captions</option><option>Bold words</option><option>Serif + bold key word</option><option>Clean single line</option><option>No captions</option></select>
<select id="pg"><option>Medium graphics</option><option>Minimal graphics</option><option>Heavy graphics</option></select>
<input id="pr" placeholder="Reference reel link (optional)"></form>`;
const build=()=>`MASH Clipper: edit clip {n} "{clipname}" in style #16 Personalize. Colours: ${{pc.value||"from my footage"}}. Fonts: ${{pf.value||"pick for me"}}. Captions: ${{pk.value}}. ${{pg.value}}. Reference: ${{pr.value||"none"}}. Follow the MASH Clipper editing rules (nothing on the face, captions on the chest under the chin, exact words only, original audio). Show me the PNG storyboard first.`;
p.onclick=(e)=>{{if(e.target.closest("form"))return;pick(p,build());}};
p.addEventListener("input",()=>{{if(p.classList.contains("on"))t.value=build();}});
g.appendChild(p);
document.getElementById("cp").onclick=async()=>{{if(!t.value)return;try{{await navigator.clipboard.writeText(t.value);}}catch(e){{t.select();document.execCommand("copy");}}
const b=document.getElementById("cp");b.textContent="Copied ✓";setTimeout(()=>b.textContent="Copy prompt",1600);}};
</script></body></html>"""
out = os.path.join(proj, "style-picker.html")
open(out, "w").write(page)
print("style picker ->", out)
