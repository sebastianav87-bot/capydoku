# v4.3.1: before/after iPhone contact sheet → reports/contact-sheet-v4.3.1-iphone.png
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
R = Path(__file__).resolve().parents[1] / "reports"
S = R / "v4.3.1/screens"
cases = [("390-tab", "p10-showme", "390×664 tab (reported)"), ("390-tab", "p10-dpad-showme", "390×664 tab · D-pad"),
         ("se-standalone", "p10-showme", "375×667 standalone"), ("se-tab", "p25-dpad-showme", "375×525 tab · 8×8"),
         ("390-standalone", "p30-showme", "390×844 standalone"), ("393-tab", "p20-showme", "393×702 tab"),
         ("430-standalone", "p5-dpad-showme", "430×932 standalone"), ("390-tab", "p29-plain", "Boss 29 · 390×664"),
         ("se-standalone", "p29-plain", "Boss 29 · 375×667"), ("390-tab", "p7-plain", "Pond 7 · 390×664")]
H = 620
def font(sz):
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
        if Path(p).exists(): return ImageFont.truetype(p, sz)
    return ImageFont.load_default()
F, FS = font(22), font(30)
def load(p):
    im = Image.open(p).convert("RGB"); return im.resize((round(im.width * H / im.height), H))
real = load(Path("/workspace/capydoku/bug-reports/iphone-crate10-cut.png"))
cols = [(load(S / "before" / f"{s}-{n}.png"), load(S / "after" / f"{s}-{n}.png"), t) for s, n, t in cases]
pad, top = 18, 90
W = pad + real.width + pad * 2 + sum(b.width + pad for b, _, _ in cols)
img = Image.new("RGB", (W, top + 2 * (H + 46) + pad), "#F4EFE1"); d = ImageDraw.Draw(img)
d.text((pad, 20), "Capydoku v4.3.1 · iPhone fit — before (v4.3 rev b) vs after · Playwright WebKit iPhone emulation (DPR 3); standalone shots shade simulated safe areas", fill="#2F3B2E", font=FS)
x = pad
d.text((x, top - 34), "Real iPhone (report)", fill="#8A2D1F", font=F); img.paste(real, (x, top)); x += real.width + pad * 3
for b, a, t in cols:
    d.text((x, top - 34), t, fill="#2F3B2E", font=F)
    img.paste(b, (x, top)); d.rectangle([x, top, x + b.width - 1, top + H - 1], outline="#B23A2A", width=4); d.text((x + 8, top + H + 8), "BEFORE", fill="#B23A2A", font=F)
    y = top + H + 46; img.paste(a, (x, y)); d.rectangle([x, y, x + a.width - 1, y + H - 1], outline="#3C7A3A", width=4); d.text((x + 8, y + H + 8), "AFTER", fill="#3C7A3A", font=F)
    x += b.width + pad
img.save(R / "contact-sheet-v4.3.1-iphone.png", optimize=True); print(R / "contact-sheet-v4.3.1-iphone.png", img.size)
