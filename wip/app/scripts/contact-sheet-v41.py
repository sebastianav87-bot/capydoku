#!/usr/bin/env python3
"""Contact sheet of every v4.1 screenshot (both viewports), key v4.1 screens first."""
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];d=ROOT/'reports/screenshots-v4.1'
key=['locked-capy','locked-capy-bump','rock-explanation-intro','rock-explanation-rules','rock-pond-21-solved','rock-pond-30-solved','home-continue-and-pond-list','level-list-scrolled','level-list-replay-sheet','transition-normal','transition-boss','transition-after-boss-breather','transition-all-clear','bloom-lock-safe-second-chance','v4-level18-migration-spring']
allf=sorted(p for p in d.rglob('*.png'))
rank=lambda p:(key.index(p.stem) if p.stem in key else 999,p.parent.name=='360x780',str(p))
files=sorted(allf,key=rank)
w,h=158,351;gap=12;label=30;cols=10;rows=(len(files)+cols-1)//cols
sheet=Image.new('RGB',(cols*(w+gap)+gap,rows*(h+label+gap)+gap),'#e9e7ce');draw=ImageDraw.Draw(sheet)
for j,p in enumerate(files):
 im=Image.open(p).convert('RGB');im.thumbnail((w,h));x=gap+(j%cols)*(w+gap);y=gap+(j//cols)*(h+label+gap);sheet.paste(im,(x+(w-im.width)//2,y));name=(('360 / ' if p.parent.name=='360x780' else '')+p.stem);draw.text((x,y+h+3),name[:26],fill='#3f513e')
sheet.save(ROOT/'reports/contact-sheet-v4.1.png')
key_files=[p for p in files if p.stem in key and p.parent.name!='360x780']
ks=Image.new('RGB',(5*(w*2//1+gap)+gap,((len(key_files)+4)//5)*(h*2+label+gap)+gap),'#e9e7ce');kd=ImageDraw.Draw(ks)
for j,p in enumerate(key_files):
 im=Image.open(p).convert('RGB');im.thumbnail((w*2,h*2));x=gap+(j%5)*(w*2+gap);y=gap+(j//5)*(h*2+label+gap);ks.paste(im,(x+(w*2-im.width)//2,y));kd.text((x,y+h*2+4),p.stem,fill='#3f513e')
ks.save(ROOT/'reports/contact-sheet-v4.1-key.png')
print(len(files),'screens; contact sheet',sheet.size,'; key sheet',len(key_files))
