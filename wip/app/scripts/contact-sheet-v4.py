#!/usr/bin/env python3
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[1];d=ROOT/'reports/screenshots-v4'
import json
files=[ROOT/r['file'] for r in json.loads((ROOT/'reports/capture-v4.json').read_text())['records']]
w,h=158,351;gap=12;label=30;cols=8;rows=(len(files)+cols-1)//cols
sheet=Image.new('RGB',(cols*(w+gap)+gap,rows*(h+label+gap)+gap),'#e9e7ce');draw=ImageDraw.Draw(sheet)
for j,p in enumerate(files):
 im=Image.open(p).convert('RGB');im.thumbnail((w,h));x=gap+(j%cols)*(w+gap);y=gap+(j//cols)*(h+label+gap);sheet.paste(im,(x+(w-im.width)//2,y));name=(('360 / ' if p.parent.name=='360x780' else '')+p.stem);draw.text((x,y+h+3),name[:26],fill='#3f513e')
sheet.save(ROOT/'reports/contact-sheet-v4.png');print(len(files),'screens; contact sheet',sheet.size)
