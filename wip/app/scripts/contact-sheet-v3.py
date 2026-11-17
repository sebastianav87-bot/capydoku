#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import math,json,hashlib,textwrap
ROOT=Path(__file__).resolve().parents[1];REPORT=ROOT/'reports';shots=sorted((REPORT/'screenshots-v3').glob('*.png'))
assert shots,'No screenshots'
try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',12)
except OSError:font=ImageFont.load_default()
rows=[]
for p in shots:
 im=Image.open(p);assert im.size==(412,915),(p.name,im.size)
 rows.append({'file':p.name,'width':412,'height':915,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
def sheet(files,path,cols,width):
 height=round(width*915/412);pad=14;caption=38;stepy=height+caption+pad
 out=Image.new('RGB',(pad+cols*(width+pad),pad+math.ceil(len(files)/cols)*stepy),'#e6e2d6');d=ImageDraw.Draw(out)
 for k,p in enumerate(files):
  x=pad+(k%cols)*(width+pad);y=pad+(k//cols)*stepy;im=Image.open(p).convert('RGB');im.thumbnail((width,height),Image.Resampling.LANCZOS);out.paste(im,(x,y));label='\n'.join(textwrap.wrap(p.stem,width=max(18,width//7)))
  d.multiline_text((x,y+height+5),label,fill='#35483e',font=font,spacing=2)
 out.save(path)
sheet(shots,REPORT/'contact-sheet-v3.png',6,206)
folder=REPORT/'visual-review-pages-v3';folder.mkdir(exist_ok=True)
for start in range(0,len(shots),6):sheet(shots[start:start+6],folder/f'page-{start//6+1:02}.png',3,275)
(REPORT/'screenshot-integrity-v3.json').write_text(json.dumps({'count':len(rows),'all_exact_412x915':True,'screenshots':rows},indent=2)+'\n')
print(len(shots),'exact-size screenshots; contact sheet and review pages written')
