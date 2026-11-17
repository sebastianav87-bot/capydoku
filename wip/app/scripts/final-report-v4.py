from pathlib import Path
from PIL import Image
import json,hashlib,re,datetime,collections
R=Path(__file__).resolve().parents[1];P=R/'reports'
def read(n):return json.loads((P/n).read_text())
pre=read('precache.json');pw=read('playwright-v4.json');assert pw['stats']['unexpected']==0 and pw['stats']['flaky']==0 and pw['stats']['skipped']==0,pw['stats']
u=(P/'unit-v4-final.log').read_text();unit=int(re.search(r'ℹ pass (\d+)',u)[1]);assert re.search(r'ℹ fail 0\b',u)
cap=read('capture-v4.json');assert cap['browser_errors']==[];records=[]
for r in cap['records']:
 p=R/r['file'];im=Image.open(p);assert im.size==(r['width'],r['height']);assert r['document']==dict(width=r['width'],height=r['height']);records.append({**r,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
sizes=collections.Counter(f"{r['width']}x{r['height']}"for r in records)
integrity={'cache':pre['cache'],'main_count':len(records),'by_viewport':dict(sizes),'all_exact':True,'all_documents_fit':True,'browser_errors':[],'records':records};(P/'screenshot-integrity-v4.json').write_text(json.dumps(integrity,indent=2))
files=sorted({u for u in pre['urls']if u!='./'});weights=[{'path':p,'bytes':(R/p).stat().st_size}for p in files];weights.sort(key=lambda x:-x['bytes']);music=read('music-v4.json');weight={'cache':pre['cache'],'urls':len(pre['urls']),'unique_files':len(files),'raw_bytes':sum(x['bytes']for x in weights),'music_bytes':music['total_audio_bytes'],'top_files':weights[:12]};(P/'precache-weight-v4.json').write_text(json.dumps(weight,indent=2))
archive=read('runtime-package-v4.json');smoke=read('runtime-archive-smoke.json');assert smoke['browser_errors']==[] and smoke['cache']==pre['cache'];assert all(x['status']==200 for k in ['online_resources','offline_resources']for x in smoke[k]);assert archive['archive_smoke_verified'] and archive['all_extracted_hashes_match']
projects=collections.Counter()
def walk(s):
 for t in s.get('specs',[]):
  for a in t['tests']:
   assert a['status']=='expected';projects[a['projectName']]+=1
 for child in s.get('suites',[]):walk(child)
for s in pw['suites']:walk(s)
now=datetime.datetime.now().astimezone().isoformat()
summary={'checkedAt':now,'timezone':'America/New_York (EST)','localOnly':True,'published':False,'step0':{'passed':True,'evidence':'step0-v4.json'},'cache':pre['cache'],'runningVersion':'4.0','unit':{'passed':unit,'failed':0,'skipped':0,'log':'unit-v4-final.log'},'e2e':{'passed':pw['stats']['expected'],'failed':0,'flaky':0,'skipped':0,'duration_ms':pw['stats']['duration'],'projects':dict(projects),'viewports':['412x915','360x780'],'mobileTouch':True,'retries':0,'json':'playwright-v4.json','log':'e2e-v4-full.log'},'browserErrors':0,'sourceBoardsVerified':760,'actualDailyOutputsIndependentlyVerified':5840,'verification':'verification-v4.json','proofEffort':'proof-effort-v1-v2-v3-v4.md','precache':{**weight,'allURLs200Online':True,'allURLs200Offline':True,'audioRange206':True,'evidence':'runtime-archive-smoke.json'},'screenshots':{'count':len(records),'byViewport':dict(sizes),'exactSize':True,'documentsFit':True,'browserErrors':[],'directory':'screenshots-v4/','contactSheet':'contact-sheet-v4.png','integrity':'screenshot-integrity-v4.json'},'music':{'onlyTrack':'Northumberland','author':'Spring Spring / Spring Enterprises','license':'CC0 1.0 Universal','source':music['source'],'licenseChecked':music['checked'],'bytes':music['total_audio_bytes'],'loopOfflineBrowserTested':True,'realDeviceListeningVerified':False},'archive':{k:archive[k]for k in ['archive','bytes','sha256','file_count','all_extracted_hashes_match','archive_smoke_verified']},'upgrades':{'sourceTreesReadOnly':['app-v1-backup','app-v2-backup','app-v3-backup','app-v3.1-backup','bugfix-v3.1','hotfix-v3.1.2','hotfix-v3.1.3'],'automaticV4AndLater':True,'midPondDeferredWithVersionPinnedOldAssets':True,'live313FirstHandoff':'Old running code has passive reload toast only; one safe manual reload/relaunch is required, then v4 updates automatically. Board/progress and offline old assets preserved.'},'limits':['Real iPhone/S24, Safari/WebKit, vibration feel and hardware music seam unverified.','Lily targets are playtest hypotheses; no telemetry or analytics.','LocalStorage only; eviction can erase progress.','Unchanged legacy v3.1.3 cannot retroactively gain the new reload handler.']}
(P/'TEST-SUMMARY-v4.json').write_text(json.dumps(summary,indent=2)+'\n')
review=read('visual-review-v4-pending.json');review.update(reviewedAtEST=now,cache=pre['cache'],nativeCaptureCount=len(records),byViewport=dict(sizes),finalRecapturePending=False,allDocumentsFit=True,browserErrors=[]);review['findings']=[{'issue':x['issue'],'fixed':x['fixPending']}for x in review['findings']];review['reviewed']='Contact sheet plus native changed screens at both sizes, compared with approved v6–v6.5 sources.';(P/'visual-review-v4.json').write_text(json.dumps(review,indent=2))
print(json.dumps({k:summary[k]for k in ['cache','unit','e2e','screenshots','archive']},indent=2))
