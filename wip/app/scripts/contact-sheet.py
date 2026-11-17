from PIL import Image, ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parents[1]
names=['01-pond-path','02-level-progress','03-hint','04-violation','05-game-over','06-chill','07-boss-pond','08-solved-start','09-solved-mid-jump','10-solved-in-spring','11-daily-pond','12-hot-spring','13-rocks-7x7','14-offline']
out=Image.new('RGB',(1130,1581),'#e6e2d6');d=ImageDraw.Draw(out)
for i,name in enumerate(names):
 im=Image.open(root/'reports/screenshots'/f'{name}.png');assert im.size==(412,915),(name,im.size)
 im.thumbnail((206,458));x=i%5*226;y=i//5*527;out.paste(im,(x+10,y+5));d.text((x+8,y+470),name,fill='#354c41')
out.save(root/'reports/contact-sheet.png')
print('14 exact 412×915 PNGs; contact sheet ready')
