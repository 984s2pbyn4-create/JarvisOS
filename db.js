/* JARVIS OS storage: local, first-party browser IndexedDB. No network. */
const NAME = 'jarvis-os-ipad-v1';
const STORES = ['notes','tasks','vault'];
let connection;

export function db() {
  if (connection) return connection;
  connection = new Promise((resolve,reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB недоступен'));
    const request = indexedDB.open(NAME,1);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of STORES) if (!database.objectStoreNames.contains(name)) database.createObjectStore(name,{keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(e=>{connection=undefined;throw e;});
  return connection;
}

async function transaction(store, mode, runner) {
  const database = await db();
  return new Promise((resolve,reject) => {
    const tx = database.transaction(store,mode);
    let value;
    let request;
    try { request = runner(tx.objectStore(store)); } catch(e) { reject(e); return; }
    if (request) { request.onsuccess=()=>{value=request.result}; request.onerror=()=>reject(request.error); }
    tx.oncomplete=()=>resolve(value);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error || new Error('Транзакция отменена'));
  });
}

export const store = {
  list: (name)=>transaction(name,'readonly',s=>s.getAll()),
  get: (name,id)=>transaction(name,'readonly',s=>s.get(id)),
  put: (name,item)=>transaction(name,'readwrite',s=>s.put(item)),
  remove: (name,id)=>transaction(name,'readwrite',s=>s.delete(id)),
  clear: (name)=>transaction(name,'readwrite',s=>s.clear())
};

export const makeId=()=>globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const fileSize = bytes => bytes < 1024 ? `${bytes} Б` : bytes < 1048576 ? `${(bytes/1024).toFixed(1)} КБ` : `${(bytes/1048576).toFixed(1)} МБ`;

export async function exportBackup(settings) {
  const notes=await store.list('notes'), tasks=await store.list('tasks'), files=await store.list('vault');
  const vault=[];
  let skipped=0;
  for (const file of files) {
    if (file.size>15*1024*1024) {skipped++;continue;}
    const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file.blob);});
    vault.push({id:file.id,name:file.name,type:file.type,size:file.size,created:file.created,dataUrl});
  }
  return {format:'jarvis-ipad-backup',version:1,created:new Date().toISOString(),settings,notes,tasks,vault,skipped};
}

export async function importBackup(data) {
  if (!data||data.format!=='jarvis-ipad-backup'||data.version!==1 || !Array.isArray(data.notes)||!Array.isArray(data.tasks)||!Array.isArray(data.vault)) throw new Error('Неподдерживаемый файл резервной копии');
  for(const group of STORES) await store.clear(group);
  for(const item of data.notes) if(item && typeof item.id==='string') await store.put('notes',{id:item.id,title:String(item.title??''),body:String(item.body??''),updated:String(item.updated??'')});
  for(const item of data.tasks) if(item && typeof item.id==='string') await store.put('tasks',{id:item.id,text:String(item.text??''),done:!!item.done,created:String(item.created??'')});
  for(const file of data.vault) {
    if(!file || typeof file.dataUrl!=='string' || !file.dataUrl.startsWith('data:') || file.dataUrl.length > 22*1024*1024) continue;
    const blob=await (await fetch(file.dataUrl)).blob();
    await store.put('vault',{id:String(file.id),name:String(file.name??'Файл'),type:String(file.type??''),size:blob.size,created:String(file.created??''),blob});
  }
  return data.settings && typeof data.settings==='object' ? data.settings : {};
}
