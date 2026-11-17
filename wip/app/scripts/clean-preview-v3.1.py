#!/usr/bin/env python3
"""Remove ONLY baked-in outer steam from Bloom's composed preview, offline.
The original JPEG is RGB, not an alpha-fringed cutout. Source is the frozen v3
snapshot. No source character PNG or mockup is modified. Existing URL is kept.
"""
from pathlib import Path
from PIL import Image,ImageFilter,ImageStat
import json,hashlib,statistics
ROOT=Path(__file__).resolve().parents[1]
src=ROOT.parent/'app-v3-backup/assets/starters/bloom-hello-pond.jpg'
original=Image.open(src).convert('RGB');w,h=original.size;assert (w,h)==(900,700)
mask=Image.new('L',(w,h));mp=mask.load();px=original.load()
for y in range(210,445):
 for x in list(range(165,260))+list(range(655,765)):
  rgb=px[x,y]
  if min(rgb)>=230 and max(rgb)-min(rgb)<12:mp[x,y]=255
mask=mask.filter(ImageFilter.MaxFilter(13)).filter(ImageFilter.GaussianBlur(1.2))
# Interpolate from untouched columns in pond-rim coordinates. Aligning the rim
# prevents a straight row fill from leaving a teal cup-shaped base at the old steam.
background=original.copy();bp=background.load()
def curve(x,points):
 return sum(y*__import__('functools').reduce(lambda a,v:a*v,((x-xj)/(xi-xj) for xj,_ in points if xj!=xi),1) for xi,y in points)
def sample(x,y):
 y=max(0,min(h-1,y));lo=int(y);hi=min(h-1,lo+1);t=y-lo
 return tuple(px[x,lo][k]*(1-t)+px[x,hi][k]*t for k in range(3))
for x0,x1,left,right,points in [(165,260,175,250,[(175,423),(240,403),(260,398)]),(655,765,680,755,[(660,403),(680,408),(755,436)])]:
 for x in range(x0,x1):
  t=(x-left)/(right-left);rim=curve(x,points)
  for y in range(200,455):
   a=sample(left,y+curve(left,points)-rim);b=sample(right,y+curve(right,points)-rim)
   bp[x,y]=tuple(round(max(0,min(255,v+(z-v)*t))) for v,z in zip(a,b))
clean=Image.composite(background,original,mask)
# Prove the edit mask does not intersect the character, including its dark outline.
roi=(270,70,650,500);assert mask.crop(roi).getbbox() is None
assert clean.crop(roi).tobytes()==original.crop(roi).tobytes()
report_dir=ROOT/'reports';clean.save(report_dir/'preview-clean-lossless-v3.1.png');mask.save(report_dir/'preview-steam-edit-mask-v3.1.png')
out=ROOT/'assets/starters/bloom-hello-pond.jpg';clean.save(out,'JPEG',quality=100,subsampling=0,optimize=True)
encoded=Image.open(out).convert('RGB');diff=__import__('PIL.ImageChops',fromlist=['difference']).difference(original.crop(roi),encoded.crop(roi));means=ImageStat.Stat(diff).mean;maximum=max(v[1]for v in diff.getextrema());assert max(means)<1 and maximum<=8,(means,maximum)
white=lambda im:sum(min(im.getpixel((x,y)))>=238 for y in range(210,445) for x in list(range(165,260))+list(range(655,765)))
report={'root_cause':'Opaque near-white steam is baked into the RGB JPEG; portrait object-fit:cover crops its columns at the frame edges. No PNG alpha fringe or CSS mask defect.','source':str(src),'output':str(out),'original_mode':'RGB (no alpha)','edit_mask_bbox':mask.getbbox(),'character_region_unmodified_before_encoding':True,'character_roi':roi,'jpeg_rounding_only_character_mean_absolute_rgb_error':means,'jpeg_rounding_only_character_max_channel_error':maximum,'near_white_steam_pixels_before':white(original),'near_white_steam_pixels_after':white(encoded),'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'clean_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'rim_aligned_background_reconstruction':True,'same_url_used_in':['first-run Bloom preview','switch-selector Bloom preview'],'character_pngs_modified':False}
(report_dir/'preview-cleanup-v3.1.json').write_text(json.dumps(report,indent=2));print(report)
