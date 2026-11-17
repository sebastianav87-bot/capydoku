#!/usr/bin/env python3
"""v4.2: exports the Designer's approved v3 crate/fruit vectors (mockup/boxworld-concept/v3/source/art_v3.py,
read-only) as standalone 48x48 SVGs for the app. Original generic vectors; no Boxworld sprite or palette."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/crates';OUT.mkdir(parents=True,exist_ok=True)
ART=Path('/workspace/capydoku/mockup/boxworld-concept/v3/source/art_v3.py')
INK='#2F3D2C'
def rect(x,y,w,h,fill='#fff',r=16,stroke='none',sw=1,extra=''):return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def circ(x,y,r,fill,stroke='none',sw=1,extra=''):return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def ell(x,y,rx,ry,fill,stroke='none',sw=1,extra=''):return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'
def path(d,stroke=INK,sw=2,fill='none',extra=''):
 cap='' if 'stroke-linecap' in extra else ' stroke-linecap="round"'  # standalone SVG must be valid XML (no duplicate attributes)
 return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{cap} stroke-linejoin="round" {extra}/>'
g=dict(rect=rect,circ=circ,ell=ell,path=path,INK=INK);exec(ART.read_text(),g)
GLOW='<defs><radialGradient id="glow"><stop stop-color="#FFE9A6" stop-opacity=".95"/><stop offset=".6" stop-color="#F4CF6B" stop-opacity=".45"/><stop offset="1" stop-color="#F4CF6B" stop-opacity="0"/></radialGradient></defs>'
def svg(body,vb='0 0 48 48'):return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="48" height="48">{body}</svg>\n'
files={'crate.svg':svg(g['crate3'](0,0)),'crate-packed.svg':svg(GLOW+g['crate_box'](6,10,36,g['PAL_F'])+g['rect'](3.5,7.5,41,41,'none',5,'#F2CF68',2.6)+g['sparkle'](5,8,4.2)+g['sparkle'](43,14,3.4),'-2 -2 52 52')}
for k in ('watermelon','banana','pear'):
 files[f'{k}.svg']=svg(g['FRUIT'][k]())
 files[f'{k}-target.svg']=svg(g['fruit_cell'](k))
for n,s in files.items():(OUT/n).write_text(s)
print(sorted(files))
