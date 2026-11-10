// New code checks automatically; controller changes never discard an active pond.
export const LAST_BUILD_KEY='capydoku.last-running-build';
export function updateNotice(storage,build,priorProgress=false){let old=null;try{old=JSON.parse(storage?.getItem(LAST_BUILD_KEY)||'null')}catch{}const changed=old?old.build!==build.build:priorProgress;try{storage?.setItem(LAST_BUILD_KEY,JSON.stringify(build))}catch{}return changed?`Updated to v${build.version}`:null}
export function createUpdateManager({serviceWorker,build,canReload=()=>false,beforeReload=()=>true,reload=()=>globalThis.location.reload(),now=()=>globalThis.performance.now(),doc=globalThis.document,win=globalThis.window,interval=60000}={}){
 let reg=null,lastCheck=-Infinity,hadController=!!serviceWorker?.controller,pending=false,reloaded=false;
 const announce=()=>{try{serviceWorker?.controller?.postMessage({type:'CAPYDOKU_CLIENT_READY',cache:build?.cache})}catch{}};
 function checkSafe(saved=false){if(!pending||reloaded||!canReload())return false;if(!saved&&beforeReload()===false)return false;reloaded=true;reload();return true}
 async function check(){if(!reg||now()-lastCheck<interval)return false;lastCheck=now();try{await reg.update();return true}catch{return false}}
 serviceWorker?.addEventListener('controllerchange',()=>{announce();if(!hadController){hadController=true;return}if(reloaded)return;pending=true;const saved=beforeReload()!==false;if(saved)checkSafe(true)});
 doc?.addEventListener('visibilitychange',()=>{if(!doc.hidden)check()});win?.addEventListener('focus',()=>check());
 return{get pending(){return pending},get reloaded(){return reloaded},check,checkSafe,watch(r){reg=r;announce();check();return r}};
}
