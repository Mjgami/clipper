"""style_board.py <project> <clip-number>
Renders the 15 MASH Clipper styles on the user's OWN clip (a real frame + the clip's hook words)
-> <project>/style-board/NN <style>.png (1080x1920 each) + <project>/style-board.png (contact sheet).
Uses HyperFrames (npx hyperframes snapshot) so the board shows real fonts, layout and grading.
"""
import glob, json, os, shutil, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

SKILL = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
proj, n = sys.argv[1], int(sys.argv[2])
cuts = json.load(open(os.path.join(proj, "cuts.json")))
clip = cuts[n - 1]
vert = glob.glob(os.path.join(proj, "clips", f"{n} * - RAW 4K.mp4"))[0]
hori = glob.glob(os.path.join(proj, "clips", f"{n} * - RAW Horizontal.mp4"))[0]
B = os.path.join(proj, "style-board", "_build")
shutil.rmtree(os.path.join(proj, "style-board"), ignore_errors=True)
os.makedirs(os.path.join(B, "fonts"))
for f in glob.glob(os.path.join(SKILL, "assets", "fonts", "*.ttf")):
    shutil.copy(f, os.path.join(B, "fonts"))
shutil.copy(os.path.join(SKILL, "assets", "gsap.min.js"), B)
t = clip.get("frame_at", 1.5)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", vert, "-frames:v", "1", "-vf", "scale=1080:1920", "-q:v", "2", os.path.join(B, "v.jpg")], check=True)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", hori, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "2", os.path.join(B, "h.jpg")], check=True)

import cv2
img = cv2.imread(os.path.join(B, "v.jpg"))
det = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
faces = det.detectMultiScale(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 1.1, 5, minSize=(160, 160))
if len(faces):
    fx, fy, fw, fh = max(faces, key=lambda r: r[2] * r[3])
    CHIN = int(fy + fh * 1.12)            # haar boxes stop at the mouth; the chin sits ~12% lower
else:
    CHIN = 1000
CAP = max(min(CHIN + 50, 1360), 1000)     # caption band: on the chest, under the chin, inside the safe zone
hook = clip.get("hook_text") or clip["name"]
words = hook.replace("’", "'").split()[:7]
key = clip.get("key_word") or max(words, key=len)
K = f'<span class="k">{key}</span>'
full = " ".join(K if w == key else w for w in words)

STYLES = [
    ("Bold Hook", f'<div class="bg v"></div><div class="cap1">{full}</div>'),
    ("Clean Creator", f'<div class="bg v soft"></div><div class="scrim"></div><div class="glass"><div class="ser">{full}</div></div>'),
    ("Podcast Clip", f'<div class="bg v blur"></div><div class="pod"><div class="hv"></div></div><div class="cap2">{full}</div><div class="wave">{"".join(f"<i style=height:{12+ (i*37)%60}px></i>" for i in range(36))}</div>'),
    ("Cinematic Trailer", f'<div class="bg v film"></div><div class="scrim"></div><div class="lb t"></div><div class="lb b"></div><div class="tr">{" ".join(words)}</div>'),
    ("Vlog Story", f'<div class="bg v warm"></div><div class="scrim"></div><div class="tag">today · day 01</div><div class="hand">{full}</div><svg class="arr" viewBox="0 0 200 120"><path d="M10 100 C 60 10, 140 10, 180 60" fill="none" stroke="#FFF" stroke-width="7" stroke-linecap="round"/><path d="M160 40 L182 62 L152 72" fill="none" stroke="#FFF" stroke-width="7" stroke-linecap="round"/></svg>'),
    ("Luxury Minimal", f'<div class="bg v bw"></div><div class="scrim"></div><div class="lux">{" ".join(words).lower()}</div>'),
    ("Documentary Explainer", f'<div class="paper"></div><div class="docimg"><div class="hv"></div></div><div class="doc">{" ".join("<mark>"+w+"</mark>" if w == key else w for w in words)}</div>'),
    ("Tech / SaaS Explainer", f'<div class="tech"></div><div class="ui"><div class="dots"><i></i><i></i><i></i></div><div class="uit">{" ".join("<b class=uik>"+w+"</b>" if w == key else w for w in words)}</div><div class="btn">Get started</div></div><svg class="cur" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.3 3.8 7.4-2.9 1.4-3.8-7.4L4 18z" fill="#fff" stroke="#000" stroke-width="1.3"/></svg><div class="tbox"><div class="hv"></div></div>'),
    ("Data Story", f'<div class="tech"></div><div class="num">87%</div><div class="nl">{" ".join(words)}</div><svg class="chart" viewBox="0 0 900 360"><polyline points="0,320 120,280 240,300 360,210 480,230 600,140 720,120 900,30" fill="none" stroke="#22D36B" stroke-width="10" stroke-linejoin="round"/></svg><div class="tbox"><div class="hv"></div></div>'),
    ("Kinetic Type", f'<div class="bg v dim"></div><div class="kin">{" ".join(f"<span class=k>{w}</span>" if w == key else w for w in words)}</div>'),
    ("Boxed Story", f'<div class="tech"></div><div class="bx"><div class="hv"></div></div><div class="cap3"><span>{" ".join("<b>"+w+"</b>" if w == key else w for w in words)}</span></div><div class="phone"><div class="scr"><div class="ig">Instagram</div><div class="post"></div><div class="ln"></div><div class="ln s"></div></div></div>'),
    ("Meme / Comedy", f'<div class="bg v punch"></div><div class="meme">{" ".join(words)}</div><div class="stk">LOL</div>'),
    ("Motivational Impact", f'<div class="bg v hc"></div><div class="flash"></div><div class="imp">{" ".join(f"<span class=r>{w}</span>" if w == key else w for w in words)}</div>'),
    ("Minimal Subtitles", f'<div class="bg v"></div><div class="sub">{" ".join(words)}</div>'),
    ("Breaking News", f'<div class="bg v"></div><div class="nbar"><b>BREAKING</b><span>{" ".join(words)}</span></div><div class="tick">LIVE · {" · ".join(words[:4])} · LIVE</div>'),
]

CSS = """
@font-face{font-family:M;src:url(fonts/Montserrat.ttf);font-weight:100 900}
@font-face{font-family:Anton;src:url(fonts/Anton.ttf)}
@font-face{font-family:Ser;src:url(fonts/InstrumentSerif-Italic.ttf)}
@font-face{font-family:PF;src:url(fonts/PlayfairDisplay-Italic.ttf)}
@font-face{font-family:Hand;src:url(fonts/Caveat.ttf)}
@font-face{font-family:Mark;src:url(fonts/PermanentMarker.ttf)}
@font-face{font-family:IT;src:url(fonts/InterTight.ttf);font-weight:100 900}
body{margin:0;background:#000}#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:#000;font-family:M}
.sc{position:absolute;inset:0;opacity:0;overflow:hidden}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}.v{background-image:url(v.jpg)}
.soft{filter:brightness(1.12) saturate(.9)}.blur{filter:blur(30px) brightness(.55);transform:scale(1.15)}
.film{filter:saturate(.75) contrast(1.15) sepia(.15)}.warm{filter:sepia(.25) saturate(1.2) brightness(1.05)}.bw{filter:grayscale(1) contrast(1.1)}
.dim{filter:brightness(.35) grayscale(.4)}.punch{transform:scale(1.25);filter:saturate(1.3)}.hc{filter:contrast(1.45) saturate(.6) brightness(.85)}
.hv{position:absolute;inset:0;background:url(h.jpg) center/cover}
.k{color:#FFD60A}
.cap1{position:absolute;left:70px;right:70px;top:CAPpx;text-align:center;font-weight:900;font-size:92px;line-height:1;text-transform:uppercase;color:#fff;-webkit-text-stroke:5px #000;paint-order:stroke fill;text-shadow:0 8px 0 #000}
.cap1 .k{font-size:120px}
.glass{position:absolute;left:90px;right:90px;top:CAPpx;padding:36px 40px;border-radius:34px;background:rgba(20,20,20,.35);backdrop-filter:blur(18px);border:1.5px solid rgba(255,255,255,.4);text-align:center}
.ser{font-family:Ser;font-size:78px;line-height:1.05;color:#fff}.ser .k{font-family:IT;font-style:normal;font-weight:900;text-transform:uppercase;color:#fff;text-shadow:0 0 30px rgba(255,255,255,.6)}
.scrim{position:absolute;left:0;right:0;bottom:0;height:1100px;background:linear-gradient(0deg,rgba(0,0,0,.78),rgba(0,0,0,0))}.bk{font-family:IT;font-weight:900;font-size:110px;color:#fff;text-transform:uppercase;letter-spacing:-.02em;text-shadow:0 0 40px rgba(255,255,255,.5)}
.pod{position:absolute;left:90px;right:90px;top:420px;height:900px;border-radius:40px;overflow:hidden;box-shadow:0 40px 90px rgba(0,0,0,.6)}.pod .hv{background-image:url(v.jpg);background-position:center 30%}
.cap2{position:absolute;left:90px;right:90px;top:1380px;text-align:center;font-weight:800;font-size:64px;color:#fff;line-height:1.1}
.wave{position:absolute;left:200px;right:200px;top:1580px;height:70px;display:flex;align-items:center;gap:8px}.wave i{flex:1;background:#fff;border-radius:6px;opacity:.85}
.lb{position:absolute;left:0;right:0;height:300px;background:#000}.lb.t{top:0}.lb.b{bottom:0}
.tr{position:absolute;left:80px;right:80px;top:CAPpx;text-align:center;font-family:PF;font-size:78px;color:#F4E9D8;text-shadow:0 4px 30px #000}
.tag{position:absolute;left:80px;top:300px;font-family:Hand;font-size:64px;color:#fff;background:rgba(0,0,0,.35);padding:4px 26px;border-radius:14px}
.hand{position:absolute;left:80px;right:80px;top:CAPpx;font-family:Hand;font-weight:700;font-size:104px;line-height:1;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.6)}.hand .k{color:#FFE08A}
.arr{position:absolute;left:640px;top:1140px;width:220px}
.lux{position:absolute;left:120px;right:120px;top:CAPpx;text-align:center;font-family:PF;font-size:62px;color:#fff;letter-spacing:.01em}
.paper{position:absolute;inset:0;background:#EFE8DA}
.docimg{position:absolute;left:90px;right:90px;top:300px;height:560px;transform:rotate(-2deg);border:14px solid #fff;box-shadow:0 20px 40px rgba(0,0,0,.25);overflow:hidden}.docimg .hv{filter:sepia(.35) contrast(1.05)}
.doc{position:absolute;left:100px;right:100px;top:960px;font-family:IT;font-weight:800;font-size:84px;line-height:1.08;color:#1B1B1B}.doc mark{background:linear-gradient(transparent 45%,#FFD233 45%);color:#1B1B1B;padding:0 8px}
.tech{position:absolute;inset:0;background:radial-gradient(80% 50% at 50% 20%,#24304A,#0B0F17 70%)}
.ui{position:absolute;left:80px;right:80px;top:300px;height:640px;border-radius:30px;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.18);padding:40px;box-sizing:border-box}
.dots i{display:inline-block;width:18px;height:18px;border-radius:50%;background:#FF5F57;margin-right:10px}.dots i:nth-child(2){background:#FEBC2E}.dots i:nth-child(3){background:#28C840}
.uit{font-family:IT;font-weight:700;font-size:64px;line-height:1.1;color:#E3EAF7;margin-top:60px}.uik{font-size:86px;font-family:IT;font-weight:900;font-size:110px;background:linear-gradient(90deg,#7CC4FF,#B388FF);-webkit-background-clip:text;color:transparent;text-transform:uppercase}
.btn{position:absolute;left:40px;bottom:40px;padding:22px 44px;border-radius:16px;background:#4F7BFF;color:#fff;font-family:IT;font-weight:700;font-size:38px}
.cur{position:absolute;left:420px;top:830px;width:70px}
.tbox{position:absolute;left:80px;right:80px;top:1040px;height:520px;border-radius:30px;overflow:hidden;border:2px solid rgba(255,255,255,.25)}
.num{position:absolute;left:80px;top:290px;font-family:IT;font-weight:900;font-size:260px;color:#22D36B;letter-spacing:-.04em}
.nl{position:absolute;left:90px;right:80px;top:580px;font-family:IT;font-weight:700;font-size:46px;color:#fff;text-transform:uppercase}
.chart{position:absolute;left:90px;top:680px;width:900px;height:330px}
.kin{position:absolute;left:70px;right:70px;top:CAPpx;font-family:Anton;font-size:96px;line-height:1.02;color:#fff;text-transform:uppercase}.kin .k{color:#FFD60A}
.bx{position:absolute;left:64px;right:64px;top:250px;height:536px;border-radius:30px;overflow:hidden;box-shadow:0 0 0 3px #FFD60A}
.cap3{position:absolute;left:64px;right:64px;top:820px;text-align:center}.cap3 span{display:inline-block;background:#111;color:#fff;font-weight:800;font-size:46px;padding:8px 18px;border-radius:10px;text-transform:uppercase}.cap3 b{color:#FFD60A;font-style:italic}
.phone{position:absolute;left:290px;top:930px;width:500px;height:1040px;border-radius:70px;background:#2A2A2A;padding:14px;box-sizing:border-box}
.scr{width:100%;height:100%;border-radius:58px;background:#fff;overflow:hidden;padding:70px 28px;box-sizing:border-box;font-family:IT}
.ig{font-family:PF;font-size:44px}.post{height:420px;margin-top:30px;border-radius:12px;background:url(h.jpg) center/cover}.ln{height:22px;background:#E5E5E5;border-radius:10px;margin-top:26px}.ln.s{width:60%}
.meme{position:absolute;left:60px;right:60px;top:CAPpx;text-align:center;font-family:Anton;font-size:104px;line-height:1;color:#fff;-webkit-text-stroke:8px #000;paint-order:stroke fill;text-transform:uppercase}
.stk{position:absolute;right:90px;top:1500px;transform:rotate(12deg);font-family:Mark;font-size:120px;color:#FF3B30;background:#fff;padding:10px 40px;border-radius:30px;box-shadow:0 14px 0 #000}
.flash{position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 55%,rgba(255,255,255,.35),transparent 70%)}
.imp{position:absolute;left:60px;right:60px;top:CAPpx;text-align:center;font-family:Anton;font-size:190px;line-height:.92;color:#fff;text-transform:uppercase;text-shadow:0 0 40px rgba(255,40,40,.6)}.imp{font-size:110px}.imp .r{color:#FF3B30}
.sub{position:absolute;left:90px;right:90px;top:CAPpx;text-align:center;font-family:IT;font-weight:600;font-size:54px;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.8)}
.nbar{position:absolute;left:0;right:0;top:CAPpx;display:flex;align-items:stretch;font-family:IT;font-weight:800}.nbar b{background:#D90429;color:#fff;font-size:52px;padding:22px 30px}.nbar span{flex:1;background:#fff;color:#111;font-size:34px;white-space:nowrap;overflow:hidden;padding:24px 30px;text-transform:uppercase}
.tick{position:absolute;left:0;right:0;top:calc(CAPpx + 110px);background:#111;color:#fff;font-family:IT;font-weight:600;font-size:36px;padding:14px 30px;white-space:nowrap;overflow:hidden}
"""
N = len(STYLES)
scenes = "\n".join(f'<div class="sc" id="s{i}">{html}</div>' for i, (_, html) in enumerate(STYLES))
js = "\n".join(f'tl.set("#s{i}",{{opacity:1}},{i});tl.set("#s{i}",{{opacity:0}},{i + 1});' for i in range(N))
open(os.path.join(B, "index.html"), "w").write(f"""<!doctype html><html><head><meta charset="utf-8"><script src="gsap.min.js"></script><style>{CSS.replace("CAPpx", str(CAP) + "px")}</style></head>
<body><div id="root" data-composition-id="main" data-start="0" data-width="1080" data-height="1920" data-duration="{N}">{scenes}</div>
<script>const tl=gsap.timeline({{paused:true}});{js}window.__timelines={{main:tl}};</script></body></html>""")
snap = os.path.join(proj, "style-board", "_snaps")
subprocess.run(["npx", "--yes", "hyperframes", "snapshot", B, "-o", snap, "--no-end", "--at", ",".join(f"{i + .5}" for i in range(N))],
               check=True, capture_output=True)
shots = sorted(glob.glob(os.path.join(snap, "frame-*.png")))
cells = []
for i, (name, _) in enumerate(STYLES):
    dst = os.path.join(proj, "style-board", f"{i + 1:02d} {name.replace('/', '-')}.png")
    shutil.copy(shots[i], dst)
    cells.append((name, dst))
# contact sheet: 5 x 3 + labels
cw, ch, lab, pad = 324, 576, 60, 18
sheet = Image.new("RGB", (pad + 5 * (cw + pad), pad + 3 * (ch + lab + pad)), "#111111")
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype(os.path.join(SKILL, "assets", "fonts", "Poppins-Bold.ttf"), 24)
for i, (name, p) in enumerate(cells):
    x, y = pad + (i % 5) * (cw + pad), pad + (i // 5) * (ch + lab + pad)
    sheet.paste(Image.open(p).convert("RGB").resize((cw, ch)), (x, y))
    d.text((x, y + ch + 12), f"{i + 1}. {name}", font=font, fill="#FFFFFF")
sheet.save(os.path.join(proj, "style-board.png"))
shutil.rmtree(B, ignore_errors=True); shutil.rmtree(snap, ignore_errors=True)
print("style board ->", os.path.join(proj, "style-board.png"))

# clickable picker (same project, same clip)
subprocess.run([sys.executable, os.path.join(SKILL, "scripts", "picker.py"), proj, str(n)], check=True)
