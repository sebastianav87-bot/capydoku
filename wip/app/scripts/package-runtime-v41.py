#!/usr/bin/env python3
from pathlib import Path
import json,hashlib,tarfile,tempfile,subprocess,sys,datetime
ROOT=Path(__file__).resolve().parents[1];REPORT=ROOT/'reports';archive=ROOT.parent/'capydoku-v4.1-runtime.tar.gz'
if archive.exists() and '--replace-local-package' not in sys.argv:raise SystemExit('Local v4.1 package already exists; use --replace-local-package intentionally. Frozen v3 is never overwritten.')
pre=json.loads((REPORT/'precache.json').read_text());names=sorted({u for u in pre['urls']if u!='./'}|{'sw.js','README.md','KNOWN-ISSUES.md','ASSET-NOTES.md'})
files=[]
with tarfile.open(archive,'w:gz')as tf:
 for name in names:
  p=ROOT/name;assert p.is_file();tf.add(p,arcname='capydoku-v4.1/'+name,recursive=False);files.append({'path':name,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
with tempfile.TemporaryDirectory(prefix='capydoku-archive-check-')as temp:
 with tarfile.open(archive)as tf:
  assert all(m.isfile()and m.name.startswith('capydoku-v4.1/')and '..'not in Path(m.name).parts for m in tf.getmembers());tf.extractall(temp,filter='data')
 extracted=Path(temp)/'capydoku-v4.1'
 for f in files:assert hashlib.sha256((extracted/f['path']).read_bytes()).hexdigest()==f['sha256']
 if '--verify'in sys.argv:
  with(REPORT/'v4.1/runtime-archive-http.log').open('w')as log:
   server=subprocess.Popen([sys.executable,'-m','http.server','8894','--bind','127.0.0.1','--directory',str(extracted)],stdout=log,stderr=subprocess.STDOUT)
   try:
    check=subprocess.run(['node','scripts/check-archive.mjs','http://127.0.0.1:8894/',str(REPORT/'precache.json'),str(REPORT/'v4.1/runtime-archive-smoke.json')],cwd=ROOT,capture_output=True,text=True);(REPORT/'v4.1/runtime-archive-smoke.log').write_text(check.stdout+check.stderr);assert check.returncode==0,check.stdout+check.stderr
   finally:server.terminate();server.wait(timeout=10)
result={'archive':str(archive),'generated_at':datetime.datetime.now().astimezone().isoformat(),'timezone':'America/New_York (EST)','bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'file_count':len(files),'all_extracted_hashes_match':True,'archive_smoke_verified':'--verify'in sys.argv,'files':files}
(REPORT/'runtime-package-v4.1.json').write_text(json.dumps(result,indent=2)+'\n');(REPORT/'runtime-package-v4.1.md').write_text('# Runtime package\n\n'+str(archive)+'\n\n'+str(len(files))+' files; '+str(result['bytes'])+' bytes. All extracted hashes match.\n\nSHA256: `'+result['sha256']+'`\n\n'+('Extracted-archive localhost/offline smoke passed.\n\n'if '--verify'in sys.argv else'')+'\n'.join('- '+f['path']for f in files)+'\n')
print(str(archive));print(len(files),'files;',result['bytes'],'bytes; SHA256',result['sha256']);print('Extracted archive hashes match; smoke verified:',result['archive_smoke_verified'])
