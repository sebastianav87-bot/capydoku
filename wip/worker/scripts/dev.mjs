// Local-only Worker + real workerd/D1 test service. Never deploys or contacts Cloudflare.
import {Miniflare} from 'miniflare';
import fs from 'node:fs';
const root=new URL('../',import.meta.url).pathname;
// workerd resolves disk module names against its process directory.
process.chdir(root);
const mf=new Miniflare({rootPath:root,host:'127.0.0.1',port:Number(process.env.RANKING_TEST_PORT||8791),modules:true,scriptPath:root+'src/index.js',modulesRules:[{type:'ESModule',include:['**/*.js']}],compatibilityDate:'2026-08-01',d1Databases:{DB:'ranking-test'},bindings:{ALLOWED_ORIGIN:'http://127.0.0.1:8765',RATE_SALT:'local-ranking-test'}});
const db=await mf.getD1Database('DB');for(const sql of fs.readFileSync(root+'schema.sql','utf8').replace(/--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
console.log('Local ranking Worker ready:',String(await mf.ready));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await mf.dispose();process.exit(0)});
