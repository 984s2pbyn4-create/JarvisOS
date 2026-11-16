/* JARVIS App Hub 2.1: standalone, local-only catalogue of trusted HTTPS URLs.
   This file NEVER executes downloaded code inside the privileged JARVIS origin. */
import {escapeHTML as esc, makeId} from './db.js';
const STORAGE='jarvis-os-apphub-v1';
const DATABASE='jarvis-os-apphub-local-v2';
const TABLE='catalog';
const ROW='entries';
const LIMIT=60;
const presets=()=>[
 {id:'preset-skip',name:'СКиП',url:'',mode:'external',favorite:true,created:'',updated:''},
 {id:'preset-skat',name:'СКАТ',url:'',mode:'external',favorite:true,created:'',updated:''}
];
let entries=presets();
const nrm=s=>String(s||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim();
export function validateAppUrl(text){
 const value=String(text||'').trim();
 if(!value)throw Error('Укажите адрес опубликованного сайта, начиная с https://');
 if(value.length>1200)throw Error('Слишком длинный адрес');
 if(!/^https:\/\//i.test(value))throw Error('Поддерживаются только безопасные адреса https://');
 let url;try{url=new URL(value)}catch{throw Error('Адрес сайта указан неверно')}
 if(url.protocol!=='https:'||url.username||url.password||!url.hostname)throw Error('Недопустимый адрес или логин в ссылке');
 const hostname=url.hostname.toLowerCase();
 if(hostname==='github.com'||hostname==='www.github.com')throw Error('Это адрес репозитория. Укажите опубликованную страницу GitHub Pages');
 if(hostname==='localhost'||hostname.endsWith('.localhost')||hostname.endsWith('.local')||hostname.endsWith('.internal')||/^\d+\.\d+\.\d+\.\d+$/.test(hostname)||hostname.startsWith('['))throw Error('Локальные и числовые адреса не поддерживаются');
 return url.href;
}
function cleanRecord(record){
 if(!record||typeof record!=='object'||Array.isArray(record))return null;
 const id=String(record.id||'').slice(0,100)||makeId();
 const name=String(record.name||'').trim().slice(0,64);
 if(!name)return null;
 let url='';if(String(record.url||'').trim()){try{url=validateAppUrl(record.url)}catch{return null}}
 return {id,name,url,mode:record.mode==='embed'?'embed':'external',favorite:!!record.favorite,created:String(record.created||'').slice(0,40),updated:String(record.updated||'').slice(0,40)};
}
export function snapshotAppHub(){return {version:1,entries:entries.map(x=>({...x}))};}
// IndexedDB is the primary durable store. localStorage is kept for migration and fallback.
// Neither is shared with Safari when an iPad Home Screen web app is isolated.
function dbOpen(){return new Promise((resolve,reject)=>{
 if(typeof indexedDB==='undefined')return reject(Error('IndexedDB недоступен'));
 const req=indexedDB.open(DATABASE,1);
 req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(TABLE))req.result.createObjectStore(TABLE)};
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error||Error('Ошибка IndexedDB'));
 req.onblocked=()=>reject(Error('Хранилище занято другой вкладкой'));
});}
function limitTime(promise,ms=3500){let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Тайм-аут хранилища')),ms)})]).finally(()=>clearTimeout(timer));}
async function idbRead(){const database=await limitTime(dbOpen());try{return await limitTime(new Promise((resolve,reject)=>{
 const tx=database.transaction(TABLE,'readonly');const req=tx.objectStore(TABLE).get(ROW);
 req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error||Error('Не удалось прочесть каталог'));
 tx.onabort=()=>reject(tx.error||Error('Чтение отменено'));
 }));}finally{database.close()}}
async function idbWrite(snapshot){const database=await limitTime(dbOpen());try{await limitTime(new Promise((resolve,reject)=>{
 const tx=database.transaction(TABLE,'readwrite');tx.objectStore(TABLE).put(snapshot,ROW);
 tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Ошибка записи'));
 tx.onabort=()=>reject(tx.error||Error('Запись отменена'));
 }));}finally{database.close()}}
function localRead(){try{const raw=localStorage.getItem(STORAGE);return raw?JSON.parse(raw):null}catch{return null}}
function snapshotTime(s){return typeof s?.savedAt==='string'?s.savedAt:''}
function connectedCount(a){return a.filter(x=>x.url).length}
function safeParse(snapshot){try{return snapshot?parseAppHubSnapshot(snapshot):null}catch{return null}}
async function persistDraft(draft){
 const snapshot={version:1,savedAt:new Date().toISOString(),entries:draft.map(x=>({...x}))};
 const json=JSON.stringify(snapshot);
 let durable=false;
 // Two independent backends: one failed backend must not erase a successful write.
 try{await idbWrite(snapshot);const check=await idbRead();if(JSON.stringify(check)!==json)throw Error('Проверка IndexedDB не совпала');durable=true}
 catch(error){console.warn('APP HUB IndexedDB:',error)}
 try{localStorage.setItem(STORAGE,json);if(localStorage.getItem(STORAGE)!==json)throw Error('Проверка localStorage не совпала');durable=true}
 catch(error){console.warn('APP HUB localStorage:',error)}
 if(!durable)throw Error('Браузер не подтвердил сохранение. Попробуйте открыть JARVIS заново, не очищая данные Safari.');
 return snapshot;
}
export async function loadAppHub(){
 const local=localRead();const fromLocal=safeParse(local);
 let indexed=null,fromIDB=null;
 try{indexed=await idbRead();fromIDB=safeParse(indexed)}catch(error){console.warn('APP HUB load:',error)}
 let selected=fromIDB,selectedMeta=indexed;
 if(fromLocal&&(!fromIDB||snapshotTime(local)>snapshotTime(indexed)||(snapshotTime(local)===snapshotTime(indexed)&&connectedCount(fromLocal)>connectedCount(fromIDB)))){
   selected=fromLocal;selectedMeta=local;
 }
 entries=selected||presets();
 // Upgrade existing v2.1 localStorage entries without losing old links.
 if(selected&&selectedMeta===local&&!fromIDB){try{await idbWrite({version:1,savedAt:snapshotTime(local),entries})}catch(error){console.warn('APP HUB migrate:',error)}}
 return getApps();
}
function parseAppHubSnapshot(value){
 if(!value||typeof value!=='object'||!Array.isArray(value.entries)||value.entries.length>LIMIT)throw Error('Неверный формат каталога приложений');
 const seen=new Set(),names=new Set();const result=[];
 for(const raw of value.entries){const r=cleanRecord(raw);if(!r)throw Error('Ошибка в записи каталога: проверьте адреса');if(seen.has(r.id))throw Error('Повторяется идентификатор приложения');if(names.has(nrm(r.name)))throw Error('Повторяется название приложения');seen.add(r.id);names.add(nrm(r.name));result.push(r);}
 return result;
}
export function validateAppHubSnapshot(value){return parseAppHubSnapshot(value).length;}
export async function importAppHub(value,persist=true){
 const next=parseAppHubSnapshot(value);if(persist)await persistDraft(next);entries=next;return getApps();
}
export function getApps(){return entries.map(x=>({...x})).sort((a,b)=>Number(b.favorite)-Number(a.favorite)||a.name.localeCompare(b.name,'ru'));}
export function getApp(id){const x=entries.find(e=>e.id===id);return x?{...x}:null;}
export async function upsertApp(form){
 const id=String(form.id||'').trim();const name=String(form.name||'').trim().slice(0,64);
 if(!name)throw Error('Введите название приложения');
 if(entries.some(e=>e.id!==id&&nrm(e.name)===nrm(name)))throw Error('Такое название уже используется в каталоге');
 const reserved=['заметки','задачи','проекты','календарь','файлы','калькулятор','джарвис','приложения','все приложения','настройки','атлас','фокус'];
 if(reserved.includes(nrm(name)))throw Error('Название совпадает со встроенным модулем JARVIS');
 const url=validateAppUrl(form.url);
 const existing=entries.find(e=>e.id===id);
 if(!existing&&entries.length>=LIMIT)throw Error('Лимит каталога: 60 приложений');
 const time=new Date().toISOString();
 const record={id:existing?.id||makeId(),name,url,mode:form.mode==='embed'?'embed':'external',favorite:existing?.favorite??false,created:existing?.created||time,updated:time};
 const next=existing?entries.map(e=>e.id===existing.id?record:e):[...entries,record];
 await persistDraft(next);entries=next;return {...record};
}
export async function deleteApp(id){const next=entries.filter(e=>e.id!==id);await persistDraft(next);entries=next;}
export async function toggleFavorite(id){const next=entries.map(e=>e.id===id?{...e,favorite:!e.favorite}:e);await persistDraft(next);entries=next;}
export function findAppCommand(utterance){
 const input=nrm(utterance);
 if(!/^(открой|открыть|запусти|запуск|покажи|перейди в|включи)\s+/.test(input))return null;
 const candidate=input.replace(/^(открой|открыть|запусти|запуск|покажи|перейди в|включи)\s+/,'').replace(/^приложение\s+/,'');
 return entries.find(e=>nrm(e.name)===candidate)||null;
}
export function canEmbed(app,origin){
 if(!app?.url||app.mode!=='embed')return false;
 try{return new URL(app.url).origin!==origin}catch{return false}
}
export function appHubView({editing=null,formVisible=false,origin=''}={}){
 const list=getApps();const count=list.filter(x=>x.url).length;
 const edit=editing?getApp(editing):null;
 return `<div class="hub-screen"><div class="hub-header"><div><div class="hub-eyebrow">JARVIS / APPLICATION GATEWAY / 2.1.1</div><h2>APP <em>HUB</em></h2><p>Ваши веб-приложения в одном командном центре. Каталог сохраняется с проверкой в локальном хранилище iPad.</p></div><div class="hub-header-stat"><strong>${count}</strong><span>ПОДКЛЮЧЕНО</span></div></div>
 <div class="hub-toolbar"><span>ПРИЛОЖЕНИЯ · ${list.length}</span><input id="hub-search" type="search" autocomplete="off" placeholder="Поиск по названию…" aria-label="Поиск по каталогу"/><button class="primary-btn" data-action="hub-new">＋ Добавить сайт</button></div>
 ${formVisible?`<form class="hub-form" id="apphub-form" novalidate><div class="hub-form-head"><h3>${edit?'Редактировать приложение':'Добавить веб-приложение'}</h3><button type="button" class="icon-button" data-action="hub-cancel">×</button></div><input type="hidden" name="id" value="${esc(edit?.id||'')}"/><label>Название<input name="name" required maxlength="64" placeholder="Например: СКиП" value="${esc(edit?.name||'')}"/></label><label>Адрес опубликованного сайта<input name="url" required type="url" inputmode="url" placeholder="https://имя.github.io/проект/" value="${esc(edit?.url||'')}"/></label><label>Способ запуска<select name="mode"><option value="external" ${edit?.mode!=='embed'?'selected':''}>Отдельно в Safari — рекомендуется для GitHub Pages</option><option value="embed" ${edit?.mode==='embed'?'selected':''}>В окне JARVIS — если сайт разрешает встраивание</option></select></label><p>Добавляйте ссылку GitHub Pages, не адрес репозитория github.com. Для внешних сайтов понадобится интернет. Никаких паролей и токенов.</p><div class="hub-form-actions"><button class="primary-btn" type="button" data-action="hub-save">Сохранить приложение</button><button type="button" class="secondary-btn" data-action="hub-cancel">Отмена</button></div></form>`:''}
 <div class="hub-cards">${list.map(app=>`<article class="hub-card" data-hub-name="${esc(nrm(app.name))}"><div class="hub-card-top"><div class="hub-monogram">${esc(app.name.slice(0,2).toUpperCase())}</div><button class="hub-star ${app.favorite?'is-fav':''}" data-action="hub-favorite" data-id="${esc(app.id)}" aria-label="${app.favorite?'Убрать из избранного':'В избранное'}">${app.favorite?'★':'☆'}</button></div><strong>${esc(app.name)}</strong><small>${app.url?esc(new URL(app.url).hostname):'НЕТ ССЫЛКИ · ТРЕБУЕТ НАСТРОЙКИ'}</small><div class="hub-card-status">${app.url?'● ГОТОВО К ЗАПУСКУ':'○ НЕ ПОДКЛЮЧЕНО'} · ${app.mode==='embed'?'ОКНО':'SAFARI'}</div><div class="hub-card-actions">${app.url?(canEmbed(app,origin)?`<button class="primary-btn" data-action="hub-launch" data-id="${esc(app.id)}">Запустить ↗</button>`:`<a class="primary-btn" href="${esc(app.url)}" target="_blank" rel="noopener noreferrer">Запустить ↗</a>`):`<button class="primary-btn" data-action="hub-edit" data-id="${esc(app.id)}">Подключить ↗</button>`}<button class="secondary-btn" data-action="hub-edit" data-id="${esc(app.id)}" aria-label="Редактировать">✎</button><button class="secondary-btn" data-action="hub-delete" data-id="${esc(app.id)}" aria-label="Удалить">×</button></div></article>`).join('')}</div>
 <div class="hub-notice">🔒 Сторонние сайты не получают доступ к базе JARVIS. Встраивание зависит от ограничений сайта и Safari. Для сайтов на том же домене, что и JARVIS, используется запуск отдельно ради безопасности.</div></div>`;
}
export function appHubFrameView(app,origin){
 if(!app)return `<div class="hub-frame-empty"><h3>Приложение не найдено</h3><button data-action="open" data-app="apphub" class="primary-btn">К каталогу</button></div>`;
 if(!app.url)return `<div class="hub-frame-empty"><h3>${esc(app.name)} не подключено</h3><p>Укажите ссылку GitHub Pages в App Hub.</p><button data-action="open" data-app="apphub" class="primary-btn">Открыть каталог</button></div>`;
 const embedded=canEmbed(app,origin);
 return `<div class="hub-frame"><div class="hub-frame-bar"><div><strong>${esc(app.name)}</strong><small>${esc(new URL(app.url).hostname)} · Внешнее веб-приложение</small></div><div class="hub-frame-actions"><button class="secondary-btn" data-action="open" data-app="apphub">Каталог</button><a class="primary-btn" href="${esc(app.url)}" target="_blank" rel="noopener noreferrer">Открыть в Safari ↗</a></div></div>${embedded?`<div class="hub-frame-tip">Если сайт показывает пустой экран или отказывает во встраивании, нажмите «Открыть в Safari».</div><iframe class="hub-iframe" title="${esc(app.name)}" src="${esc(app.url)}" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-downloads" referrerpolicy="no-referrer" loading="eager"></iframe>`:`<div class="hub-frame-empty"><div class="hub-monogram">${esc(app.name.slice(0,2).toUpperCase())}</div><h3>${esc(app.name)}</h3><p>${app.mode==='external'?'Для этого приложения выбран отдельный запуск.':'Сайт расположен на том же домене, что и JARVIS. Встраивание отключено ради защиты ваших данных.'}</p><a class="primary-btn" href="${esc(app.url)}" target="_blank" rel="noopener noreferrer">Открыть приложение ↗</a></div>`}</div>`;
}
