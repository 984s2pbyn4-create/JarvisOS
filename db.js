/* JARVIS OS storage v2. The original database name is intentionally unchanged.
   Upgrade from v0.2.3 to v1.0 preserves notes/tasks/vault. */
const NAME = 'jarvis-os-ipad-v1';
const STORES = ['notes', 'tasks', 'vault', 'events', 'projects', 'cards'];
let connection;

export function db(){
  if (connection) return connection;
  connection = new Promise((resolve,reject)=>{
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB недоступен'));
    const request=indexedDB.open(NAME, 2);
    request.onupgradeneeded=()=>{
      const database=request.result;
      for(const name of STORES){
        if(!database.objectStoreNames.contains(name)) database.createObjectStore(name,{keyPath:'id'});
      }
    };
    request.onsuccess=()=>{
      const database=request.result;
      database.onversionchange=()=>{ database.close();connection=undefined; };
      resolve(database);
    };
    request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('Закройте другие вкладки JARVIS и повторите'));
  }).catch(e=>{connection=undefined;throw e});
  return connection;
}

async function transaction(name,mode,runner){
  const database=await db();
  return new Promise((resolve,reject)=>{
    const tx=database.transaction(name,mode);
    let value;
    let request;
    try{request=runner(tx.objectStore(name));}catch(e){try{tx.abort()}catch{}reject(e);return;}
    if(request){request.onsuccess=()=>{value=request.result};request.onerror=()=>reject(request.error);}
    tx.oncomplete=()=>resolve(value);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error('Транзакция отменена'));
  });
}

export const store={
  list:name=>transaction(name,'readonly',s=>s.getAll()),
  get:(name,id)=>transaction(name,'readonly',s=>s.get(id)),
  put:(name,item)=>transaction(name,'readwrite',s=>s.put(item)),
  remove:(name,id)=>transaction(name,'readwrite',s=>s.delete(id)),
  clear:name=>transaction(name,'readwrite',s=>s.clear())
};
export const makeId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fileSize=bytes=>bytes<1024?`${bytes} Б`:bytes<1048576?`${(bytes/1024).toFixed(1)} КБ`:`${(bytes/1048576).toFixed(1)} МБ`;
const MAX_BACKUP=80*1024*1024;
const MAX_FILE=15*1024*1024;
const allowed=(obj)=>obj&&typeof obj==='object'&&!Array.isArray(obj);
const trimmed=(val,max)=>String(val??'').slice(0,max);

async function encodeBlob(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error||new Error('Невозможно прочесть файл'));
    reader.readAsDataURL(blob);
  });
}

export async function exportBackup(settings={}){
  const [notes,tasks,files,events,projects,cards]=await Promise.all(STORES.map(x=>store.list(x)));
  const vault=[];let skipped=0;
  for(const f of files){
    if(f.size>MAX_FILE){skipped++;continue;}
    const dataUrl=await encodeBlob(f.blob);
    vault.push({id:f.id,name:f.name,type:f.type,size:f.size,created:f.created,dataUrl});
  }
  return {format:'jarvis-ipad-backup',version:2,created:new Date().toISOString(),settings,notes,tasks,vault,events,projects,cards,skipped};
}

// Validate and decode everything BEFORE opening the destructive transaction.
// The final replace happens atomically in IndexedDB, so partial imports roll back.
export async function prepareBackup(data){
  if(!allowed(data)||data.format!=='jarvis-ipad-backup'||![1,2].includes(data.version))throw Error('Формат резервной копии не поддерживается');
  for(const name of ['notes','tasks','vault'])if(!Array.isArray(data[name]))throw Error('В копии отсутствует раздел '+name);
  if(data.version===2)for(const name of ['events','projects','cards'])if(!Array.isArray(data[name]))throw Error('В копии отсутствует раздел '+name);
  if(JSON.stringify(data).length>MAX_BACKUP)throw Error('Копия превышает допустимый размер 80 МБ');
  const result={notes:[],tasks:[],vault:[],events:[],projects:[],cards:[]};
  const cleanId=item=>item&&typeof item.id==='string'&&item.id.length<200;
  const cap=5000;
  for(const name of STORES)if((data[name]||[]).length>cap)throw Error('В резервной копии слишком много записей: '+name);
  for(const item of data.notes)if(cleanId(item))result.notes.push({id:item.id,title:trimmed(item.title,300),body:trimmed(item.body,200000),updated:trimmed(item.updated,80)});
  for(const item of data.tasks)if(cleanId(item))result.tasks.push({id:item.id,text:trimmed(item.text,400),done:!!item.done,created:trimmed(item.created,80)});
  for(const item of data.events||[])if(cleanId(item))result.events.push({id:item.id,title:trimmed(item.title,160),start:trimmed(item.start,80),end:trimmed(item.end,80),notes:trimmed(item.notes,2000),created:trimmed(item.created,80)});
  for(const item of data.projects||[])if(cleanId(item))result.projects.push({id:item.id,title:trimmed(item.title,120),description:trimmed(item.description,1500),created:trimmed(item.created,80)});
  for(const item of data.cards||[])if(cleanId(item))result.cards.push({id:item.id,projectId:trimmed(item.projectId,200),title:trimmed(item.title,400),column:['todo','doing','done'].includes(item.column)?item.column:'todo',created:trimmed(item.created,80)});
  let totalBytes=0;
  for(const item of data.vault){
    if(!cleanId(item)||typeof item.dataUrl!=='string'||!/^data:[^,]*;base64,/.test(item.dataUrl))throw Error('Повреждён файл в копии');
    if(item.dataUrl.length>Math.ceil(MAX_FILE*4/3)+256)throw Error('Слишком большой файл в копии');
    totalBytes+=item.dataUrl.length;
    if(totalBytes>MAX_BACKUP)throw Error('Резервная копия слишком велика');
    const blob=await (await fetch(item.dataUrl)).blob();
    if(blob.size>MAX_FILE)throw Error('Файл превышает лимит 15 МБ');
    result.vault.push({id:item.id,name:trimmed(item.name,255),type:trimmed(item.type,120),size:blob.size,created:trimmed(item.created,80),blob});
  }
  return {records:result,settings:allowed(data.settings)?data.settings:{},counts:Object.fromEntries(STORES.map(name=>[name,result[name].length]))};
}

export async function commitBackup(prepared){
  if(!prepared||!prepared.records)throw Error('Не подготовлена резервная копия');
  const database=await db();
  await new Promise((resolve,reject)=>{
    const tx=database.transaction(STORES,'readwrite');
    try{
      for(const name of STORES){
        const objectStore=tx.objectStore(name);
        objectStore.clear();
        for(const item of prepared.records[name])objectStore.put(item);
      }
    }catch(e){try{tx.abort()}catch{}reject(e);return;}
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error||new Error('Восстановление отменено'));
  });
  return prepared.settings;
}

export async function importBackup(data){return commitBackup(await prepareBackup(data));}
