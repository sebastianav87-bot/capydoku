#!/usr/bin/env python3
"""v4.3 contact sheets: every new v4.3 screenshot (both viewports) + a key sheet; regression shots get their own sheet."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];d=ROOT/'reports/screenshots-v4.3'
key=['revb-hub-launch','revb-wrong-capy-shake','revb-pond23-v42-after-rejects','revb-rules-wrong-spot','revb-hub-in-progress','revb-summary-no-replay','revb-hub-boss','revb-hub-gate','revb-hub-breather','revb-hub-finale','revb-hub-all-clear','revb-hot-spring-header','revb-progress-replay-list','home-crate-next','home-pond-list-roles','transition-crate-5','crate-5-start','crate-5-packed','crate-5-reward-3-lilies','crate-5-reward-undo-no-clean','crate-5-reward-over-par','transition-pond-6-spare','crate-15-show-me-offered','crate-15-show-me-replaying','crate-15-show-me-reward','transition-gate-10','crate-10-gate-reward','crate-20-start','crate-25-start','crate-30-finale-start','crate-30-finale-reward','all-clear-90','boss-29-10x10','pond-1-7x7','pond-6-8x8','pond-14-9x9','pond-21-9x9','migration-ponds-refreshed','settings-v43','v421-to-v43-build-label','locked-conflict-ring','undo-no-phantom']
def sheet(files,out,cols=9,w=158,h=351,gap=12,label=30):
 rows=max(1,(len(files)+cols-1)//cols);S=Image.new('RGB',(cols*(w+gap)+gap,rows*(h+label+gap)+gap),'#e9e7ce');D=ImageDraw.Draw(S)
 for j,p in enumerate(files):
  im=Image.open(p).convert('RGB');im.thumbnail((w,h));x=gap+(j%cols)*(w+gap);y=gap+(j//cols)*(h+label+gap);S.paste(im,(x+(w-im.width)//2,y));D.text((x,y+h+3),(('360 / ' if p.parent.name=='360x780' else '')+p.stem)[:28],fill='#3f513e')
 S.save(out);return S.size
new=[p for p in d.rglob('*.png') if 'regression' not in p.parts]
rank=lambda p:(key.index(p.stem) if p.stem in key else 999,p.parent.name=='360x780',str(p))
new=sorted(new,key=rank);reg=sorted((d/'regression').rglob('*.png'))
print('new',len(new),sheet(new,ROOT/'reports/contact-sheet-v4.3.png'))
k412=[p for p in new if p.stem in key and p.parent.name!='360x780'];k360=[p for p in new if p.stem in key and p.parent.name=='360x780']
print('key',len(k412)+len(k360),sheet(k412+k360,ROOT/'reports/contact-sheet-v4.3-key.png',cols=9,w=316,h=702,label=34))
print('regression',len(reg),sheet(reg,ROOT/'reports/contact-sheet-v4.3-regression.png',cols=14))
