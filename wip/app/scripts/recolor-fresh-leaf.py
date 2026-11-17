#!/usr/bin/env python3
"""v4.3 rev b · apply the Designer's green A "Fresh Leaf" (mockup/v4.3-green/report.md) to the LIVE app CSS.
Same rules as the Designer's tools/recolor.py: token hexes map exactly (here to theme variables), every other UI
green (CIELCh hue 110-165, chroma >= 12) is shifted toward hue 141 / chroma 46 at the same lightness. The :root
theme block and the Designer's skip-list selectors are left alone. Writes reports/v4.3/fresh-leaf-mapping.json.
Run once (idempotence guard: refuses if the theme block already holds Fresh Leaf)."""
import re,json,sys
from pathlib import Path
import numpy as np
from skimage.color import rgb2lab,lab2rgb
ROOT=Path(__file__).resolve().parents[1]
CSS=['style.css','theme-v3.css','starters-v3.css','visuals-v4.css','power-identity-v4.css','rewards-v4.css','home-v41.css','bonus-v42.css','crates-v43.css']
def h2r(h):h=h.lstrip('#');return np.array([int(h[i:i+2],16) for i in (0,2,4)])/255
def r2h(r):r=np.clip(np.round(np.asarray(r)*255),0,255).astype(int);return '%02X%02X%02X'%tuple(r)
def lch(h):L,a,b=rgb2lab(h2r(h)[None,None])[0,0];return float(L),float(np.hypot(a,b)),float(np.degrees(np.arctan2(b,a))%360)
def from_lch(L,C,H):
    for _ in range(60):
        a=C*np.cos(np.radians(H));b=C*np.sin(np.radians(H));rgb=lab2rgb(np.array([[[L,a,b]]]))[0,0]
        if np.abs(rgb2lab(rgb[None,None])[0,0]-[L,a,b]).max()<0.5:return r2h(rgb)
        C*=0.97
    return r2h(rgb)
OPT_H,OPT_C=141,46
TOK={'primary':('--green-600','3B7E3D'),'primary_top':('--green-300','418042'),'pressed':('--green-700','2C6C2F'),'border':('--green-550','29612C'),
 'lip':('--green-lip','89A986'),'accent':('--green-500','4B904C'),'accent_soft':('--green-soft','D5E8D2'),'header':('--ink-header','314E2F'),
 'subtext':('--ink-sub','546F52'),'frame':('--board-frame','71946E')}
TOKEN_MAP={'7EAC77':'primary_top','537B56':'primary','698A6C':'primary','7FB27E':'primary_top','4F8A58':'primary','80B96E':'primary_top','4E944F':'primary',
 '66885B':'border','789563':'border','4C7048':'pressed','A8B18A':'lip','3D5F41':'lip','5E9A63':'accent','6EAF78':'accent','4E9454':'accent','6D945C':'accent',
 'DEE7C7':'accent_soft','3F513E':'header','718264':'subtext','6E8A63':'subtext','879D7B':'frame'}
SKIP_SEL=('orange','daily-lily','.home .path','lantern','fireflies')
HEX=re.compile(r'#([0-9A-Fa-f]{8}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})\b')
def shift(h6):
    L,C,H=lch('#'+h6)
    if not(110<=H<=165 and C>=12):return None
    nh=OPT_H+(H-138)*0.4;k=OPT_C/34.0
    return from_lch(L,min(C*min(k,1.45),C+22,60),nh)
def recolor(text,log,where):
    root=re.search(r':root\s*\{[^}]*\}',text);keep=(root.start(),root.end()) if root else (-1,-1)
    out=[];pos=0
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}',text):
        if keep[0]<=m.start(2)<keep[1]:continue
        sel=m.group(1).strip()
        def rep(hm):
            h=hm.group(1).upper()
            if len(h)==3:h=''.join(c*2 for c in h)
            h6,al=h[:6],h[6:]
            if any(s in sel for s in SKIP_SEL):return hm.group(0)
            if h6 in TOKEN_MAP:
                var,new=TOK[TOKEN_MAP[h6]]
                val=f'var({var})' if not al else f'color-mix(in srgb,var({var}) {round(int(al,16)/2.55)}%,transparent)'
            else:
                new=shift(h6)
                if not new:return hm.group(0)
                val='#'+new+al
            log.setdefault('#'+h6,{'to':'#'+new,'token':TOKEN_MAP.get(h6),'uses':[]})['uses'].append(f'{where}: {sel[-60:]}')
            return val
        out.append(text[pos:m.start(2)]+HEX.sub(rep,m.group(2)));pos=m.end(2)
    out.append(text[pos:]);return ''.join(out)
if __name__=='__main__':
    style=(ROOT/'style.css').read_text()
    if 'fresh-leaf-mapping' in style:sys.exit('Fresh Leaf already applied')
    log={}
    for f in CSS:
        p=ROOT/f;p.write_text(recolor(p.read_text(),log,f))
    out=ROOT/'reports/v4.3/fresh-leaf-mapping.json';out.write_text(json.dumps(log,indent=1))
    print(len(log),'greens remapped;',sum(1 for v in log.values() if v['token']),'to theme tokens ->',out)
