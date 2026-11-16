/* SPATIAL FORGE: isolated local-first store. Never changes legacy JARVIS database. */
export const SPATIAL_VERSION=1;
const DB_NAME='jarvis-spatial-forge-v3';
const STORAGE_KEY='jarvis-spatial-v3-fallback';
const initial=()=>({version:1,mode:'engineering',selected:'gear-a',exploded:0,orbit:{yaw:-0.66,pitch:0.31,zoom:1},space:{sofa:false,island:false,curtain:false,lights:true,night:false},annotations:[],links:[]});
let cache=initial();
let loaded=false;
const copy=x=>JSON.parse(JSON.stringify(x));
function db(){return new Promise((resolve,reject)=>{if(typeof indexedDB==='undefined')return reject(Error('IndexedDB unavailable'));const rq=indexedDB.open(DB_NAME,1);rq.onupgradeneeded=()=>{if(!rq.result.objectStoreNames.contains('settings'))rq.result.createObjectStore('settings')};rq.onerror=()=>reject(rq.error);rq.onblocked=()=>reject(Error('IndexedDB blocked'));rq.onsuccess=()=>resolve(rq.result);});}
async function readDB(){const conn=await db();return new Promise((resolve,reject)=>{const tx=conn.transaction('settings','readonly');const rq=tx.objectStore('settings').get('main');rq.onsuccess=()=>resolve(rq.result||null);rq.onerror=()=>reject(rq.error);tx.oncomplete=()=>conn.close();});}
async function writeDB(value){const conn=await db();return new Promise((resolve,reject)=>{const tx=conn.transaction('settings','readwrite');tx.objectStore('settings').put(value,'main');tx.oncomplete=()=>{conn.close();resolve()};tx.onerror=()=>{conn.close();reject(tx.error)};});}
const str=(x,n)=>String(x||'').slice(0,n);
const num=(x,lo,hi,otherwise)=>Number.isFinite(Number(x))?Math.max(lo,Math.min(hi,Number(x))):otherwise;
export function validateSpatial(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1)throw Error('Неизвестный формат Spatial Forge');
 const def=initial(),o=value.orbit||{},s=value.space||{};
 const annotations=Array.isArray(value.annotations)?value.annotations:[];
 const links=Array.isArray(value.links)?value.links:[];
 if(annotations.length>200||links.length>500)throw Error('Превышен предел пространственных данных');
 return {version:1,mode:['engineering','space','knowledge','ar'].includes(value.mode)?value.mode:'engineering',selected:str(value.selected,160),
 exploded:num(value.exploded,0,1,0),orbit:{yaw:num(o.yaw,-50,50,def.orbit.yaw),pitch:num(o.pitch,-1.25,1.25,def.orbit.pitch),zoom:num(o.zoom,.45,3,1)},
 space:Object.fromEntries(Object.keys(def.space).map(key=>[key,typeof s[key]==='boolean'?s[key]:def.space[key]])),
 annotations:annotations.filter(x=>x&&typeof x.id==='string').map(x=>({id:str(x.id,80),target:str(x.target,160),text:str(x.text,600),at:str(x.at,50)})),
 links:links.filter(x=>x&&typeof x.from==='string'&&typeof x.to==='string').map(x=>({from:str(x.from,200),to:str(x.to,200)}))};
}
export function snapshotSpatial(){return copy(cache)};
export function getSpatial(){return cache;}
export async function loadSpatial(){
 if(loaded)return cache;
 let value=null;
 try{value=await readDB()}catch(err){console.warn('Spatial IndexedDB:',err)}
 if(!value){try{value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{}}
 try{if(value)cache=validateSpatial(value)}catch(err){console.warn('Invalid spatial settings:',err)}
 loaded=true;return cache;
}
let saveSeq=Promise.resolve();
export async function saveSpatial(){const value=snapshotSpatial();saveSeq=saveSeq.catch(()=>{}).then(async()=>{let good=false;try{await writeDB(value);good=true}catch(e){console.warn('Spatial DB save:',e)}try{localStorage.setItem(STORAGE_KEY,JSON.stringify(value));good=true}catch(e){console.warn('Spatial localStorage save:',e)}if(!good)throw Error('Нет доступного локального хранилища Spatial Forge');});return saveSeq;}
export async function importSpatial(value){const next=validateSpatial(value);const old=cache;cache=next;try{await saveSpatial()}catch(err){cache=old;throw err}return cache;}
export function resetSpatialDemo(){const next=initial();Object.assign(cache,{mode:next.mode,selected:next.selected,exploded:0,orbit:next.orbit,space:next.space});return saveSpatial();}
