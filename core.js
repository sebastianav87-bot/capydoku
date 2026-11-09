/* No dependencies, no network, no hidden solution table. */
export const SCHEMA=1, KEY='capydoku.progress.v1', DOUBLE_TAP_MS=280;
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
  for(let h=0;h<hs.length;h++){
   const opts=hs[h].filter(i=>can.has(i));if(!opts.length)return{ok:false,trace,fixed:[...fixed]};
   if(opts.length===1&&!fixed.has(opts[0])){
    const cell=opts[0];fixed.add(cell);for(const j of [...can])if(peers(p,cell,j))can.delete(j);
    trace.push({technique:'house-single',cell,house:h,unit:hs[h]});changed=true;
    if(firstOnly)return {ok:true,trace,fixed:[...fixed]};break;
   }
   if(opts.length>1){const gone=[...can].filter(j=>opts.every(a=>peers(p,a,j)));if(gone.length){gone.forEach(j=>can.delete(j));trace.push({technique:'shared-conflict',house:h,options:opts,removed:gone});changed=true;break}}
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
  return{cell:step.cell,unit:step.unit,kind:'forced',support:cause?.options??[],excluded:cause?.removed.filter(i=>step.unit.includes(i))??[],reason:`Only spot left in this ${label}.${source?` Ringed spots clash with every option in ${source}.`:' The other spots are marked or blocked by capys.'}`};
 }
 const repair=cells.findIndex(v=>v===1),placed=cells.findLastIndex(v=>v===2);
 return{cell:repair>=0?repair:placed,unit:[],kind:'repair',reason:'No safe nudge from this layout. Undo a mark or capy, then try again.'};
}
// Independent runtime backtracker, used only by verification/tests (not Hint).
export function enumerate(p){const n=p.n,out=[];function dfs(r,cols,zones,prev,path){if(r===n){out.push([...path]);return}for(let c=0;c<n;c++){const i=r*n+c,z=p.zones[i];if(cols.has(c)||zones.has(z)||p.rocks.includes(i)||(r>0&&Math.abs(c-prev)<=1))continue;cols.add(c);zones.add(z);path.push(i);dfs(r+1,cols,zones,c,path);cols.delete(c);zones.delete(z);path.pop()}}dfs(0,new Set(),new Set(),-99,[]);return out}
export function calendarDay(d=new Date()){return Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000)}
export function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function dailyPuzzle(data,d=new Date()){
 const day=calendarDay(d),epoch=Math.floor(Date.UTC(2026,0,1)/86400000),offset=day-epoch,index=((offset%365)+365)%365,cycle=Math.floor(offset/365),variant=((cycle%8)+8)%8,p=data.daily[index],n=p.n;
 function trans(i){let r=Math.floor(i/n),c=i%n;if(variant&4)c=n-1-c;for(let k=0;k<(variant%4);k++)[r,c]=[c,n-1-r];return r*n+c}
 const zones=Array(n*n);p.zones.forEach((z,i)=>zones[trans(i)]=z);return{...p,zones,rocks:p.rocks.map(trans).sort((a,b)=>a-b),id:`daily-${dateKey(d)}`,date:dateKey(d),day};
}
export function fresh(){return{version:SCHEMA,completed:[],selected:'Classic',chill:false,daily:{lastDay:null,streak:0},sessions:{}}}
export function sanitize(raw){
 if(!raw||raw.version!==SCHEMA)return fresh();const p=fresh();p.completed=[...new Set((Array.isArray(raw.completed)?raw.completed:[]).filter(n=>Number.isInteger(n)&&n>=1&&n<=30))].sort((a,b)=>a-b);p.chill=raw.chill===true;
 const allowed=['Classic',...(p.completed.includes(10)?['Beanie']:[]),...(p.completed.includes(20)?['Orange']:[]),...(p.completed.includes(30)?['Duck']:[])];p.selected=allowed.includes(raw.selected)?raw.selected:'Classic';
 if(Number.isInteger(raw.daily?.lastDay)&&Number.isInteger(raw.daily?.streak)&&raw.daily.streak>=0&&raw.daily.streak<100000)p.daily={lastDay:raw.daily.lastDay,streak:raw.daily.streak};
 if(raw.sessions&&typeof raw.sessions==='object')for(const [key,v]of Object.entries(raw.sessions).slice(-40)){if(/^(pond-([1-9]|[12][0-9]|30)|daily-\d{4}-\d{2}-\d{2})$/.test(key)&&[25,36,49].includes(v?.cells?.length)&&v.cells.every(x=>[0,1,2].includes(x))&&Number.isInteger(v.lives)&&v.lives>=0&&v.lives<=3)p.sessions[key]={cells:v.cells,lives:v.lives}}
 return p;
}
export function load(storage){try{const raw=JSON.parse(storage.getItem(KEY)||'null');return{progress:sanitize(raw),readOnly:!!raw&&raw.version!==SCHEMA,error:null}}catch(e){return{progress:fresh(),readOnly:false,error:'Progress could not be read. This session still works.'}}}
export function save(storage,progress,readOnly=false){if(readOnly)return false;try{storage.setItem(KEY,JSON.stringify(sanitize(progress)));return true}catch{return false}}
export function unlocked(p){for(let n=1;n<=30;n++)if(!p.completed.includes(n))return n;return 30}
export function streakAt(p,day){return p.daily.lastDay!==null&&day-p.daily.lastDay<=1&&day>=p.daily.lastDay?p.daily.streak:0}
export function finishDaily(p,day){if(p.daily.lastDay!==null&&day<=p.daily.lastDay)return p.daily;p.daily={lastDay:day,streak:p.daily.lastDay===day-1?p.daily.streak+1:1};return p.daily}
export function move(p,state,i,value,chill){if(p.rocks.includes(i)||state.lives===0&&!chill||!Number.isInteger(i)||i<0||i>=state.cells.length)return state;const cells=[...state.cells];cells[i]=value;const loss=value===2&&violations(p,cells).has(i)&&!chill?1:0;return{cells,lives:Math.max(0,state.lives-loss)}}
