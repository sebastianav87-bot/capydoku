import{cleanMetrics,cleanLilies}from './rewards.js';
import{nickname}from './profile.js';
/* No dependencies, no network, no hidden solution table. */
export const SCHEMA=3, KEY='capydoku.progress.v3', V2_KEY='capydoku.progress.v2', LEGACY_KEY='capydoku.progress.v1', DOUBLE_TAP_MS=280, DRAG_THRESHOLD=10, DRAG_TICK_MS=12, DRAG_TICK_GAP=70;
export function peers(p,a,b){const n=p.n,ar=Math.floor(a/n),br=Math.floor(b/n),ac=a%n,bc=b%n;return a!==b&&(ar===br||ac===bc||p.zones[a]===p.zones[b]||Math.max(Math.abs(ar-br),Math.abs(ac-bc))<=1)}
export function violations(p,cells){const capys=cells.map((v,i)=>v===2?i:-1).filter(i=>i>=0),bad=new Set();for(const a of capys){if(p.rocks.includes(a))bad.add(a);for(const b of capys)if(peers(p,a,b)){bad.add(a);bad.add(b)}}return bad}
export function solved(p,cells){return cells.filter(v=>v===2).length===p.n&&violations(p,cells).size===0&&!p.rocks.some(i=>cells[i]===2)}
export function units(p){const n=p.n;return [...Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>r*n+c)),...Array.from({length:n},(_,c)=>Array.from({length:n},(_,r)=>r*n+c)),...Array.from({length:n},(_,z)=>p.zones.map((v,i)=>v===z?i:-1).filter(i=>i>=0))]}
export function logic(p,cells=Array(p.n*p.n).fill(0),firstOnly=false){
 const n=p.n,hs=units(p),fixed=new Set(cells.map((v,i)=>v===2?i:-1).filter(i=>i>=0));
 if(violations(p,cells).size)return {ok:false,trace:[],fixed:[...fixed]};
 const can=new Set(Array.from({length:n*n},(_,i)=>i).filter(i=>!p.rocks.includes(i)&&cells[i]!==1&&!Array.from(fixed).some(a=>peers(p,a,i))));
 const trace=[];let changed=true;
 while(changed&&fixed.size<n){changed=false;
  const choices=hs.map(unit=>unit.filter(i=>can.has(i)));
  if(choices.some(opts=>!opts.length))return{ok:false,trace,fixed:[...fixed]};
  const h=choices.findIndex(opts=>opts.length===1&&!fixed.has(opts[0]));
  if(h>=0){const cell=choices[h][0];fixed.add(cell);for(const j of [...can])if(peers(p,cell,j))can.delete(j);trace.push({technique:'house-single',cell,house:h,unit:hs[h]});changed=true;if(firstOnly)return{ok:true,trace,fixed:[...fixed]};continue}
  for(let h=0;h<hs.length;h++){
   const opts=choices[h];if(opts.length<2)continue;
   const gone=[...can].filter(j=>opts.every(a=>peers(p,a,j)));
   if(gone.length){gone.forEach(j=>can.delete(j));trace.push({technique:'shared-conflict',house:h,options:opts,removed:gone});changed=true;break}
  }
 }
 return {ok:fixed.size===n,trace,fixed:[...fixed]};
}
export function hint(p,cells){
 const bad=[...violations(p,cells)];if(bad.length)return{cell:bad[0],unit:bad,kind:'repair',reason:'These capys need space. Clear one red capy.'};
 // Finish the monotone proof first: locally legal but incorrect capys/marks may contradict a later house.
 // Never advise a speculative cell from an inconsistent partial board.
 const proof=logic(p,cells),step=proof.trace.find(t=>t.cell!==undefined);
 if(proof.ok&&step){
  const h=step.house,n=p.n,label=h<n?`row ${h+1}`:h<2*n?`column ${h-n+1}`:'patterned zone';
  const before=proof.trace.slice(0,proof.trace.indexOf(step));
  const cause=before.filter(t=>t.removed?.some(i=>step.unit.includes(i))).at(-1);
  const names=['dotted zone','dashed zone','lily zone','diagonal zone','ringed zone','striped zone','chevron zone'];
  const source=cause?(cause.house<n?`row ${cause.house+1}`:cause.house<2*n?`column ${cause.house-n+1}`:`the ${names[cause.house-2*n]}`):null;
  return{cell:step.cell,unit:step.unit,kind:'forced',support:cause?.options??[],excluded:cause?.removed.filter(i=>step.unit.includes(i))??[],reason:`Only spot left in this ${label}.${source?` Ringed spots clash with every option in ${source}.`:step.unit.length===1?' This patterned zone has just one cell.':' The other spots are marked or blocked by capys.'}`};
 }
 const repair=cells.findIndex(v=>v===1),placed=cells.findLastIndex(v=>v===2);
 return{cell:repair>=0?repair:placed,unit:[],kind:'repair',reason:'No safe nudge from this layout. Undo a mark or capy, then try again.'};
}
// Independent row backtracker: verification and single-cell Peek candidates only.
export function enumerate(p){const n=p.n,out=[];function dfs(r,cols,zones,prev,path){if(r===n){out.push([...path]);return}for(let c=0;c<n;c++){const i=r*n+c,z=p.zones[i];if(cols.has(c)||zones.has(z)||p.rocks.includes(i)||(r>0&&Math.abs(c-prev)<=1))continue;cols.add(c);zones.add(z);path.push(i);dfs(r+1,cols,zones,c,path);cols.delete(c);zones.delete(z);path.pop()}}dfs(0,new Set(),new Set(),-99,[]);return out}
export function calendarDay(d=new Date()){return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000)}
export function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function dailyPuzzle(data,d=new Date(),eligible=false){
 const day=calendarDay(d),epoch=Math.floor(Date.UTC(2026,0,1)/86400000),offset=day-epoch,index=((offset%365)+365)%365,cycle=Math.floor(offset/365),variant=((cycle%8)+8)%8,p=(eligible?data.daily:(data.dailySafe??data.daily.filter(p=>!p.rocks.length)))[index],n=p.n;
 function trans(i){let r=Math.floor(i/n),c=i%n;if(variant&4)c=n-1-c;for(let k=0;k<(variant%4);k++)[r,c]=[c,n-1-r];return r*n+c}
 const zones=Array(n*n);p.zones.forEach((z,i)=>zones[trans(i)]=z);return{...p,zones,rocks:p.rocks.map(trans).sort((a,b)=>a-b),id:`daily-${dateKey(d)}-${eligible?'rocks':'safe'}`,date:dateKey(d),day};
}
export function fresh(){return{version:SCHEMA,nickname:'',lilies:{},dailyLilies:{},completed:[],selected:'Jun',starterChosen:false,goldenLilies:[],legacySelected:null,haptics:true,audio:false,music:true,tutorialSeen:false,powerIntroSeen:[],rockIntroSeen:false,rocksReached:false,daily:{lastDay:null,streak:0},sessions:{}}}
export function cleanAttempt(v,length){
 const raw=v?.power??{},used=raw.used===true,kind=['peek','secondChance','nap'].includes(raw.kind)?raw.kind:null;
 return{metrics:cleanMetrics(v?.metrics),power:{used,kind,napRemaining:used&&kind==='nap'&&Number.isInteger(raw.napRemaining)?Math.max(0,Math.min(3,raw.napRemaining)):0,peekCell:used&&kind==='peek'&&Number.isInteger(raw.peekCell)&&raw.peekCell>=0&&raw.peekCell<length?raw.peekCell:null},lastMistake:Number.isInteger(v?.lastMistake?.cell)&&v.lastMistake.cell>=0&&v.lastMistake.cell<length?{cell:v.lastMistake.cell}:null};
}
export function legacyRelaxAttempt(raw,v){return v?.relax===true||v?.chill===true||(v?.relax===undefined&&v?.chill===undefined&&(raw?.chill===true||raw?.relax===true))}
export function sanitize(raw){
 if(!raw||raw.version!==SCHEMA)return fresh();const p=fresh();p.completed=[...new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=30))].sort((a,b)=>a-b);p.nickname=nickname(raw.nickname).valid?nickname(raw.nickname).text:'';p.lilies=cleanLilies(raw.lilies,p.completed);p.dailyLilies=cleanLilies(raw.dailyLilies,[],true);p.haptics=raw.haptics!==false;p.audio=raw.audio===true;p.music=raw.music!==false;p.rockIntroSeen=raw.rockIntroSeen===true;p.rocksReached=raw.rocksReached===true;
 p.powerIntroSeen=[...new Set((Array.isArray(raw.powerIntroSeen)?raw.powerIntroSeen:[]).filter(k=>['Jun:peek','Bloom:secondChance','Remy:nap'].includes(k)))];
 p.tutorialSeen=raw.tutorialSeen===true||(raw.tutorialSeen===undefined&&p.completed.includes(1));
 p.selected=['Jun','Bloom','Remy'].includes(raw.selected)?raw.selected:'Jun';p.starterChosen=raw.starterChosen===true;
 p.goldenLilies=[...new Set((Array.isArray(raw.goldenLilies)?raw.goldenLilies:[]).filter(id=>[10,20,30].includes(id)&&p.completed.includes(id)))];
 p.legacySelected=['Classic','Beanie','Orange','Duck'].includes(raw.legacySelected)?raw.legacySelected:null;
 if(Number.isInteger(raw.daily?.lastDay)&&Number.isInteger(raw.daily?.streak)&&raw.daily.streak>=0&&raw.daily.streak<100000)p.daily={lastDay:raw.daily.lastDay,streak:raw.daily.streak};
 if(raw.sessions&&typeof raw.sessions==='object')for(const [key,v]of Object.entries(raw.sessions).slice(-40)){if(!legacyRelaxAttempt(raw,v)&&/^(pond-([1-9]|[12][0-9]|30)|daily-\d{4}-\d{2}-\d{2}-(safe|rocks))$/.test(key)&&[25,36,49].includes(v?.cells?.length)&&v.cells.every(x=>[0,1,2].includes(x))&&Number.isInteger(v.lives)&&v.lives>=0&&v.lives<=3)p.sessions[key]={cells:[...v.cells],lives:v.lives,signature:typeof v.signature==='string'?v.signature.slice(0,256):'',...cleanAttempt(v,v.cells.length)}}
 return p;
}
export function migrateV2(raw){return sanitize({...raw,version:SCHEMA,selected:({Classic:'Jun',Beanie:'Remy',Orange:'Bloom',Duck:'Jun'})[raw.selected]||'Jun',legacySelected:raw.selected,starterChosen:true,goldenLilies:[]})}
export function boardSignature(p){return `${p.n}|${p.zones.join('')}|${[...p.rocks].sort((a,b)=>a-b).join(',')}`}
export function rocksUnlocked(p){return p.rocksReached||unlocked(p)>=21||p.completed.some(n=>n>=21)}
export function migrateV1(raw,data){
 const p=migrateV2({...raw,haptics:true,audio:false,music:true,rockIntroSeen:false,rocksReached:false});p.sessions={};
 p.rocksReached=rocksUnlocked(p);
 // Only 21–30 are unchanged; all retuned and legacy daily partial boards start fresh.
 if(data)for(const [key,v]of Object.entries(raw.sessions??{})){
  if(legacyRelaxAttempt(raw,v))continue;const match=/^pond-(2[1-9]|30)$/.exec(key);if(!match||!data.v1Preserved?.includes(Number(match[1])))continue;
  const q=data.levels[Number(match[1])-1];
  if(v?.cells?.length===q.n*q.n&&v.cells.every(x=>[0,1,2].includes(x))&&Number.isInteger(v.lives)&&v.lives>=0&&v.lives<=3)p.sessions[key]={cells:[...v.cells],lives:v.lives,signature:boardSignature(q),...cleanAttempt(null,q.n*q.n)};
 }
 return p;
}
export function load(storage,data=null){try{
 const value=storage.getItem(KEY),raw=JSON.parse(value||'null');
 if(raw){const progress=sanitize(raw),readOnly=raw.version!==SCHEMA,migrated=!readOnly&&(['chill','relax'].some(k=>Object.hasOwn(raw,k))||Object.values(raw.sessions??{}).some(v=>v&&typeof v==='object'&&['chill','relax'].some(k=>Object.hasOwn(v,k))));let error=null;if(migrated)try{storage.setItem(KEY,JSON.stringify(progress))}catch{error='Progress migration is in memory only; storage is unavailable.'}return{progress,readOnly,error,migrated}}
 const v2=JSON.parse(storage.getItem(V2_KEY)||'null'),old=v2?.version===2?v2:JSON.parse(storage.getItem(LEGACY_KEY)||'null');
 if(old?.version===1||old?.version===2){const progress=old.version===1?migrateV1(old,data):migrateV2(old);let error=null;try{storage.setItem(KEY,JSON.stringify(progress))}catch{error='Progress migration is in memory only; storage is unavailable.'}return{progress,readOnly:false,error,migrated:true}}
 return{progress:fresh(),readOnly:false,error:null,migrated:false};
 }catch{return{progress:fresh(),readOnly:false,error:'Progress could not be read. This session still works.',migrated:false}}}
export function save(storage,progress,readOnly=false){if(readOnly)return false;try{storage.setItem(KEY,JSON.stringify(sanitize(progress)));return true}catch{return false}}
export function unlocked(p){for(let n=1;n<=30;n++)if(!p.completed.includes(n))return n;return 30}
export function streakAt(p,day){return p.daily.lastDay!==null&&day-p.daily.lastDay<=1&&day>=p.daily.lastDay?p.daily.streak:0}
export function finishDaily(p,day){if(p.daily.lastDay!==null&&day<=p.daily.lastDay)return p.daily;p.daily={lastDay:day,streak:p.daily.lastDay===day-1?p.daily.streak+1:1};return p.daily}
export function move(p,state,i,value,protectedMove=false){if(p.rocks.includes(i)||state.lives===0||!Number.isInteger(i)||i<0||i>=state.cells.length||state.cells[i]===value||![0,1,2].includes(value))return state;const cells=[...state.cells];cells[i]=value;const loss=value===2&&violations(p,cells).has(i)&&!protectedMove?1:0;return{cells,lives:Math.max(0,state.lives-loss)}}

// Pure mark painter: never changes rocks/capys and is idempotent within a gesture.
export function paintMark(p,cells,i,value){if(!Number.isInteger(i)||i<0||i>=cells.length||p.rocks.includes(i)||cells[i]===2||cells[i]===value||![0,1].includes(value))return cells;const next=[...cells];next[i]=value;return next}
export const HAPTICS={legal:32,illegal:[45,60,45],solve:[45,60,70,60,105],tick:DRAG_TICK_MS,splash:18};
export function vibrate(kind,enabled=true,nav=globalThis.navigator){if(!enabled||typeof nav?.vibrate!=='function')return false;try{return nav.vibrate(HAPTICS[kind])!==false}catch{return false}}
