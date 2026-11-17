from pathlib import Path
import json,hashlib,tarfile,datetime
ROOT=Path(__file__).resolve().parents[1];BASE=ROOT.parent;rows=[]
for version,folder in [('v1','app-v1-backup'),('v2','app-v2-backup'),('v3','app-v3-backup'),('v31-ui','app-v31-ui-backup')]:
 baseline=json.loads((BASE/f'{version}-backup-sha256.json').read_text());bad=[n for n,h in baseline.items()if hashlib.sha256((BASE/folder/n).read_bytes()).hexdigest()!=h];assert not bad,(folder,bad);rows.append({'snapshot':str(BASE/folder),'original_files_checked':len(baseline),'all_original_hashes_match':True})
step=json.loads((BASE/'v4-step0/SUCCESS.json').read_text());baseline=step['backup_hashes'];folder=BASE/'app-v3.1-backup';bad=[n for n,h in baseline.items()if hashlib.sha256((folder/n).read_bytes()).hexdigest()!=h];assert not bad,bad
actual={str(p.relative_to(folder))for p in folder.rglob('*')if p.is_file()};assert actual==set(baseline),(len(actual),len(baseline))
rows.append({'snapshot':str(folder),'original_files_checked':len(baseline),'same_file_list':True,'all_original_hashes_match':True})
archives=[]
for version,expected in [('v3','60c7ce33b1e3452d361a68e69e9521c1d969dccb93c07467862e317d3a365288'),('v3.1',step['tar_sha256'])]:
 p=BASE/f'capydoku-{version}-runtime.tar.gz';sha=hashlib.sha256(p.read_bytes()).hexdigest();assert sha==expected;count=0
 with tarfile.open(p)as t:
  for m in t.getmembers():
   if not m.isfile():continue
   name=Path(m.name);parts=name.parts[1:]if name.parts[0].startswith('capydoku-')else name.parts;target=BASE/f'app-{version}-backup'/Path(*parts);assert hashlib.sha256(t.extractfile(m).read()).hexdigest()==hashlib.sha256(target.read_bytes()).hexdigest();count+=1
 archives.append({'path':str(p),'sha256':sha,'unchanged':True,'all_archive_members_match_backup':True,'file_count':count})
x={'checked_at':datetime.datetime.now().astimezone().isoformat(),'timezone':'America/New_York (EST)','step0_passed_before_app_edits':True,'snapshots':rows,'archives':archives};(ROOT/'reports/backup-integrity-v4.json').write_text(json.dumps(x,indent=2)+'\n');print(json.dumps(x,indent=2))
