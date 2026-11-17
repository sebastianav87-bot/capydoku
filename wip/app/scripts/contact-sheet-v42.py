#!/usr/bin/env python3
"""v4.2 contact sheets: every new v4.2 screenshot (both viewports) + a key sheet; regression shots get their own sheet."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];d=ROOT/'reports/screenshots-v4.2'
key=['offer-after-pond-5','bonus-controls-card','bonus-play-start','bonus-play-first-fruit-packed','bonus-level-1-packed','bonus-deadlock-undo','bonus-reward','pond-6-with-spare-orange','pond-6-spare-orange-used','offer-after-pond-15','bonus-level-2-start','bonus-level-2-mid','bonus-level-2-packed','offer-after-pond-25','bonus-level-3-start','bonus-level-3-mid','bonus-level-3-packed','bonus-play-dpad','settings-dpad','v41-to-v42-build-label']
def sheet(files,out,cols=9,w=158,h=351,gap=12,label=30):
 rows=max(1,(len(files)+cols-1)//cols);S=Image.new('RGB',(cols*(w+gap)+gap,rows*(h+label+gap)+gap),'#e9e7ce');D=ImageDraw.Draw(S)
 for j,p in enumerate(files):
  im=Image.open(p).convert('RGB');im.thumbnail((w,h));x=gap+(j%cols)*(w+gap);y=gap+(j//cols)*(h+label+gap);S.paste(im,(x+(w-im.width)//2,y));D.text((x,y+h+3),(('360 / ' if p.parent.name=='360x780' else '')+p.stem)[:28],fill='#3f513e')
 S.save(out);return S.size
new=[p for p in d.rglob('*.png') if 'regression' not in p.parts]
rank=lambda p:(key.index(p.stem) if p.stem in key else 999,p.parent.name=='360x780',str(p))
new=sorted(new,key=rank);reg=sorted((d/'regression').rglob('*.png'))
print('new',len(new),sheet(new,ROOT/'reports/contact-sheet-v4.2.png'))
k412=[p for p in new if p.stem in key and p.parent.name!='360x780'];k360=[p for p in new if p.stem in key and p.parent.name=='360x780']
print('key',len(k412)+len(k360),sheet(k412+k360,ROOT/'reports/contact-sheet-v4.2-key.png',cols=9,w=316,h=702,label=34))
print('regression',len(reg),sheet(reg,ROOT/'reports/contact-sheet-v4.2-regression.png',cols=14))
