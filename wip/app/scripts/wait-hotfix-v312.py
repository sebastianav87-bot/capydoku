from pathlib import Path
import ctypes,select,time,json,hashlib,re,os,datetime
source=Path('../hotfix-v3.1.2');libc=ctypes.CDLL(None);fd=libc.inotify_init1(2048);libc.inotify_add_watch(fd,str(source.parent.resolve()).encode(),0x00000100|0x00000080|0x00000008)
start=time.monotonic();last=None;since=None
while time.monotonic()-start<900:
 try:
  sw=(source/'sw.js').read_text();m={'cache':json.loads(re.search(r'const CACHE=(.+);',sw)[1]),'urls':json.loads(re.search(r'const PRECACHE=(.+);',sw)[1])};names=sorted(set('index.html'if u=='./'else u for u in m['urls'])|{'sw.js'});digest={n:hashlib.sha256((source/n).read_bytes()).hexdigest()for n in names}
  # Wait for the announced illustrated-piece hotfix, not its initial copied v3.1.1 staging tree.
  generic=[n for n in names if 'generic-capy' in n];assert generic and any(b'base64,' in (source/n).read_bytes() or n.endswith('.png') for n in generic),'illustrated piece not present yet'
  if digest==last and time.monotonic()-since>=30:
   Path('reports/hotfix-v312-read-only-source.json').write_text(json.dumps({'source':str(source.resolve()),'readOnly':True,'checkedAtEST':datetime.datetime.now().astimezone().isoformat(),'cache':m['cache'],'runtimeHashes':digest,'unchangedAcrossSeconds':time.monotonic()-since},indent=2)+'\n');print('v3.1.2 illustrated runtime ready and stable:',m['cache'],len(names),'files',flush=True);break
  if digest!=last:last=digest;since=time.monotonic();print('Illustrated v3.1.2 runtime present; confirming stability',flush=True)
 except (FileNotFoundError,KeyError,ValueError,AssertionError,json.JSONDecodeError):print('Waiting read-only for completed illustrated v3.1.2 runtime',flush=True)
 if select.select([fd],[],[],30)[0]:os.read(fd,65536)
else:raise SystemExit('v3.1.2 source did not become ready within 15 minutes; no source edits made')
