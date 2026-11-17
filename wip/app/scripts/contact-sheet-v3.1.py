from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,hashlib,textwrap,math
ROOT=Path(__file__).resolve().parents[1];r=ROOT/'reports';s=r/'screenshots-v3.1';rows=[]
for p in sorted(s.rglob('*.png')):
 with Image.open(p)as im:
  expected=(360,780)if'360x780'in p.parts else(412,915)
  assert im.size==expected,(str(p),im.size)
  w,h=im.size
 rows.append({'file':str(p.relative_to(s)),'width':w,'height':h,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
files=['before-peek-duplicate','after-peek-single-card','before-chooser-bloom','after-chooser-bloom','before-nap-duplicate','after-nap-single-card','before-card-idle','after-card-idle','before-v3-flight-0300ms','before-v3-flight-0600ms','before-v3-flight-1200ms','reference-v1-flight-0800ms','after-launch-jun-airborne','after-v31-flight-1100ms','after-v31-flight-1400ms','after-launch-jun-soaked','after-sizing-412-5x5','after-sizing-412-6x6','after-sizing-412-7x7','360x780/after-sizing-360-7x7','after-end-normal-412','after-end-boss-412','after-end-boss30-412','after-end-daily-412','360x780/after-end-normal-360','360x780/after-end-boss-360','360x780/after-end-boss30-360','360x780/after-end-daily-360','after-settings-music-on','after-settings-music-off','after-music-credits','after-offline-upgrade']
files += [f'sizing/{mode}-level-{level}-{n}x{n}'for mode in 'AB'for level,n in [(3,5),(9,6),(21,7)]]
files=[s/(n+'.png')for n in files if(s/(n+'.png')).exists()]
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
def sheet(files,dest,cols=4):
 width=206;height=458;pad=14;caption=48
 out=Image.new('RGB',(pad+cols*(width+pad),pad+math.ceil(len(files)/cols)*(height+caption+pad)),'#e5e8df');d=ImageDraw.Draw(out)
 for k,p in enumerate(files):
  x=pad+k%cols*(width+pad);y=pad+k//cols*(height+caption+pad)
  with Image.open(p)as im:im=im.convert('RGB');im.thumbnail((width,height),Image.Resampling.LANCZOS);out.paste(im,(x,y))
  label=('360×780 · 'if'360x780'in p.parts else'')+p.stem
  d.multiline_text((x,y+height+5),'\n'.join(textwrap.wrap(label,28)),font=font,fill='#344b3f',spacing=2)
 out.save(dest)
sheet(files,r/'contact-sheet-v3.1.png')
new=[s/x['file']for x in rows if not x['file'].startswith('regression/')]
for i in range(0,len(new),8):sheet(new[i:i+8],r/f'contact-review-v3.1-{i//8+1:02}.png')
(r/'screenshot-integrity-v3.1.json').write_text(json.dumps({'count':len(rows),'native_412x915':sum(x['width']==412 for x in rows),'additional_native_360x780':sum(x['width']==360 for x in rows),'all_exact_requested_sizes':True,'screenshots':rows},indent=2));print(len(rows),'native screenshots;',len(files),'on main contact sheet;',math.ceil(len(new)/8),'review sheets')
