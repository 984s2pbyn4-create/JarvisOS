/* JARVIS OS 3.0 / SPATIAL FORGE. No dependency for the primary 3D, knowledge, or smart-space scenes. */
import {escapeHTML as esc,makeId} from './db.js';
import {getSpatial,saveSpatial,resetSpatialDemo} from './spatial-data.js';
import {engineeringParts,apartmentParts,drawGrid,drawMeshScene,drawKnowledge,knowledgeNodes,parseOBJ,SPATIAL_SCENE_NAMES} from './spatial-engine.js';
const BASE=new URL('./',import.meta.url).href;
let imported=null;
let previousSelected={engineering:'gear-a',space:'sofa-base',knowledge:'hub:projects',ar:'gear-a'};
const buttons=[['engineering','Инженерия','⚙'],['space','Умное пространство','⌂'],['knowledge','Вселенная знаний','◇'],['ar','Дополненная реальность','▣']];
const save=()=>saveSpatial().catch(e=>console.warn('Spatial save:',e));
const modeTitle=mode=>SPATIAL_SCENE_NAMES[mode]||'SPATIAL FORGE';
const human=(value,max=150)=>esc(String(value||'').slice(0,max));
function infoBox(){const cfg=getSpatial();const s=cfg.space;switch(cfg.mode){
 case 'engineering':return `<div class="sp-mode-note">Составной демонстрационный редуктор. Касайтесь деталей, выполняйте разборку и добавляйте заметки. Это визуальная модель, не расчёт прочности.</div><label class="sp-range-label">РАЗОБРАТЬ МЕХАНИЗМ <strong id="sp-explode-number">${Math.round(cfg.exploded*100)}%</strong></label><input class="sp-range" data-sp="explode" type="range" min="0" max="100" value="${Math.round(cfg.exploded*100)}"/><div class="sp-mini-actions"><button data-sp="toggle-explode">${cfg.exploded>.2?'Собрать':'Разобрать всё'}</button><button data-sp="import-obj">Загрузить OBJ</button>${imported?`<button data-sp="clear-obj">Вернуть демомодель</button>`:''}<input id="sp-obj-file" type="file" accept=".obj,text/plain" hidden/></div><div class="sp-hint">OBJ импортируется для просмотра только в текущем сеансе. Для постоянной AR-модели нужен подготовленный USDZ.</div>`;
 case 'space':return `<div class="sp-mode-note">Демонстрационная комната, не ваша фактическая планировка. Сценарии сохраняются на этом iPad.</div><div class="sp-control-list">${[['sofa','Разложить диван'],['island','Выдвинуть полуостров'],['curtain','Закрыть шторы'],['lights','Освещение'],['night','Ночной режим']].map(([k,label])=>`<button class="sp-switch ${s[k]?'on':''}" data-sp="space-toggle" data-key="${k}"><span>${label}</span><b>${s[k]?'ВКЛ':'ВЫКЛ'}</b></button>`).join('')}</div><button class="sp-reset" data-sp="reset-scene">Сбросить демонстрационную сцену</button>`;
 case 'knowledge':return `<div class="sp-mode-note">Сеть строится из ваших настоящих записей JARVIS: проекты, карточки, заметки, события, файлы. Связи карточек с проектами используются из базы, дополнительные связи можно задавать вручную.</div><div class="sp-hint" id="sp-graph-count">Выберите узел, чтобы увидеть сведения и открыть запись.</div>`;
 default:return `<div class="sp-mode-note">AR Quick Look открывает USDZ-модель в системном просмотрщике Apple. Настройки и распознавание жестов JARVIS не накладываются поверх AR.</div><div class="sp-hint">После касания образца iPadOS предложит просмотр модели или размещение её в комнате. Требуется совместимый Safari, разрешение камеры и доступ к USDZ-файлу.</div>`;
 }}
function arGallery(){return `<section class="sp-ar-gallery"><div class="sp-section-label">AR / ГОТОВЫЕ МОДЕЛИ</div><div class="sp-ar-tiles">${[
 ['mechanism.usdz','actuator.png','Механический модуль','Концептуальная инженерная модель'],['studio.usdz','studio.png','Демо-комната','Условная комната с мебелью']
 ].map(([file,preview,title,description])=>`<a rel="ar" class="sp-ar-tile" href="${BASE+file}"><img alt="3D-превью ${esc(title)}" src="${BASE+preview}"/><strong>${title}</strong><small>${description}</small><span>ОТКРЫТЬ В AR ↗</span></a>`).join('')}</div><div class="sp-hint">Образцы включены в архив и доступны без стороннего сервера. Отображение проверяется системой Quick Look на самом iPad; локальные тесты не могут подтвердить успешное размещение.</div></section>`;}
export function spatialView(state){const cfg=getSpatial();return `<div class="sp-root" id="sp-root">
 <header class="sp-hero"><div><div class="sp-eyebrow">JARVIS / SPATIAL SYSTEM / 3.0.0</div><h2>SPATIAL <em>FORGE</em></h2><p>Единое пространство для моделей, механизмов, квартиры, документов и AR.</p></div><div class="sp-status"><span>◉ 3D ENGINE</span><strong>READY</strong><small>LOCAL-FIRST · IPAD</small></div></header>
 <nav class="sp-modes" aria-label="Режим пространственного просмотра">${buttons.map(([id,name,icon])=>`<button data-sp="mode" data-mode="${id}" class="${cfg.mode===id?'active':''}" aria-pressed="${cfg.mode===id}"><span>${icon}</span><b>${name}</b></button>`).join('')}</nav>
 <div class="sp-layout"><aside class="sp-side sp-side-left"><div class="sp-panel-head"><span>01 / УПРАВЛЕНИЕ</span><strong>${modeTitle(cfg.mode)}</strong></div>${infoBox()}<div class="sp-legend"><span>✦ КАСАНИЕ — ВЫБРАТЬ</span><span>◌ СВАЙП — ВРАЩАТЬ</span><span>◉ ДВА ПАЛЬЦА — МАСШТАБ</span></div></aside>
 <section class="sp-stage" aria-label="Интерактивная трёхмерная сцена"><div class="sp-stage-head"><span>LIVE SPATIAL RENDER</span><span id="sp-fps">LOCAL</span></div><canvas id="sp-canvas" role="img" aria-label="Трёхмерная интерактивная сцена. Вращение одним пальцем, масштабирование двумя, выбор детали касанием."></canvas><div class="sp-stage-bottom"><span id="sp-stage-state">${modeTitle(cfg.mode)}</span><div><button data-sp="zoom-out" aria-label="Уменьшить масштаб">−</button><button data-sp="camera-reset" aria-label="Исходный вид">◎</button><button data-sp="zoom-in" aria-label="Увеличить масштаб">+</button></div></div></section>
 <aside class="sp-side sp-side-right"><div class="sp-panel-head"><span>02 / INSPECTOR</span><strong>СВЕДЕНИЯ ОБ ОБЪЕКТЕ</strong></div><div id="sp-details" aria-live="polite"></div><div class="sp-camera-block"><div class="sp-camera-head"><span>GESTURE ENGINE</span><span id="sp-camera-badge">ВЫКЛ</span></div><p>Управление рукой через фронтальную камеру. Нужна сеть для первой загрузки MediaPipe и разрешение на камеру.</p><video id="sp-cam-video" autoplay muted playsinline hidden></video><div id="sp-cam-status" role="status" class="sp-hint">Пока используется надёжное сенсорное управление.</div><div class="sp-mini-actions"><button data-sp="camera-on">Камера / жесты</button><button data-sp="camera-off" disabled>Остановить</button></div><small>Двигайте рукой для вращения; сведите большой и указательный пальцы для выбора детали или разборки. Видео не загружается на сервер JARVIS.</small></div></aside></div>
 ${cfg.mode==='ar'?arGallery():''}
 <footer class="sp-footer">Данные сцены и пользовательские связи хранятся на iPad. AR передаётся в Quick Look. Распознавание жестов зависит от камеры и подключения модели.</footer></div>`;}
function describe(cfg,state,objects,selected){if(cfg.mode==='knowledge'){
 const graph=knowledgeNodes(state,cfg.links);const node=graph.nodes.find(n=>n.id===selected);if(!node)return `<div class="sp-empty">Выберите элемент пространственной сети касанием.</div>`;
 const choices=graph.nodes.filter(n=>n.kind!=='hub'&&n.id!==node.id).slice(0,100);
 const manual=cfg.links.filter(l=>l.from===node.id||l.to===node.id);
 const linkCount=graph.links.filter(l=>l[0]===node.id||l[1]===node.id).length;
 return `<div class="sp-detail-title">${human(node.label)}</div><div class="sp-detail-meta">${human(node.kind.toUpperCase())} · СВЯЗЕЙ ${linkCount}</div><p>${node.kind==='hub'?'Центральный узел категории JARVIS.':'Данные из вашей локальной базы JARVIS.'}</p>${node.app?`<button class="sp-main-btn" data-sp="open-record">Открыть запись ↗</button>`:''}${choices.length&&node.kind!=='hub'?`<div class="sp-section-label">СОЗДАТЬ СВЯЗЬ</div><select id="sp-link-target" class="sp-select"><option value="">Выберите объект</option>${choices.map(n=>`<option value="${esc(n.id)}">${human(n.label,65)}</option>`).join('')}</select><button class="sp-alt-btn" data-sp="add-link">Связать объекты</button>`:''}${manual.length?`<div class="sp-section-label">ПОЛЬЗОВАТЕЛЬСКИЕ СВЯЗИ</div>${manual.map(l=>{const to=l.from===node.id?l.to:l.from;const linked=graph.nodes.find(n=>n.id===to);return `<div class="sp-note">${human(linked?.label||to)}<button data-sp="remove-link" data-from="${esc(l.from)}" data-to="${esc(l.to)}" aria-label="Удалить связь">×</button></div>`}).join('')}`:''}`;
 }
 const item=objects.find(o=>o.id===selected);if(!item)return `<div class="sp-empty">Коснитесь объекта в сцене, чтобы изучить его.</div>`;
 const notes=cfg.annotations.filter(n=>n.target===`${cfg.mode}:${selected}`);
 return `<div class="sp-detail-title">${human(item.label)}</div><div class="sp-detail-meta">ID: ${human(item.id.toUpperCase())}</div><p>${human(item.detail||'Интерактивный компонент 3D-модели.',600)}</p><div class="sp-metrics"><div><small>СЦЕНА</small><strong>${human(modeTitle(cfg.mode))}</strong></div><div><small>МОДЕЛЬ</small><strong>${item.kind==='gear'?'ШЕСТЕРНЯ':item.kind==='cyl'?'ЦИЛИНДР':'ОБЪЁМ'}</strong></div></div><div class="sp-section-label">ЗАМЕТКИ К ДЕТАЛИ</div><div class="sp-notes">${notes.length?notes.map(n=>`<div class="sp-note">${human(n.text,600)}<button data-sp="remove-note" data-id="${esc(n.id)}" aria-label="Удалить заметку">×</button></div>`).join(''):'<small>Заметок пока нет</small>'}</div><form id="sp-note-form"><input id="sp-note-input" maxlength="600" placeholder="Добавить техническую заметку…" aria-label="Заметка к детали"/><button type="submit">Сохранить</button></form>`;
}
export function initSpatial(root,{state,onNavigate=()=>{},onToast=()=>{},onRefresh=()=>{},reduced=false}={}){
 if(!root)return ()=>{};
 const cfg=getSpatial(),mode=cfg.mode,canvas=root.querySelector('#sp-canvas'),ctx=canvas?.getContext('2d');if(!ctx)return ()=>{};
 let disposed=false,raf=0,lastDraw=0,lastFps=0,hover=[],selected=cfg.selected;
 let camStream=null,landmarker=null,cameraRaf=0,hadPinch=false,lastHand=null,firstFrame=0,lastMediaTime=-1;
 const touches=new Map();let pointerStart=null,lastPinchDistance=0;
 let observer;
 const message=t=>{onToast(t);const tslot=root.querySelector('#sp-cam-status');if(tslot&&t.toLocaleLowerCase('ru').includes('камер'))tslot.textContent=t};
 const currentObjects=()=>mode==='space'?apartmentParts(cfg.space):(mode==='engineering'&&imported)?[imported]:engineeringParts(reduced?0:performance.now()/1000);
 const currentItems=()=>mode==='knowledge'?knowledgeNodes(state,cfg.links).nodes:currentObjects();
 const renderDetails=()=>{const details=root.querySelector('#sp-details');if(details)details.innerHTML=describe(cfg,state,currentItems(),selected);if(mode==='knowledge'){const total=knowledgeNodes(state,cfg.links);const n=root.querySelector('#sp-graph-count');if(n)n.textContent=`Объекты: ${total.nodes.length}. Связи: ${total.links.length}. Нажмите на узел для открытия.`;}};
 const select=id=>{selected=id;cfg.selected=id;previousSelected[mode]=id;renderDetails();save();};
 const ensureSelected=()=>{const list=currentItems();if(!list.some(o=>o.id===selected)){selected=list[0]?.id||'';cfg.selected=selected;}renderDetails();};
 ensureSelected();
 const draw=t=>{if(disposed)return;raf=requestAnimationFrame(draw);if(t-lastDraw<(reduced?80:33))return;lastDraw=t;
  const bounds=canvas.getBoundingClientRect(),w=Math.max(80,bounds.width),h=Math.max(130,bounds.height);const dpi=Math.min(1.75,window.devicePixelRatio||1);
  const ww=Math.round(w*dpi),hh=Math.round(h*dpi);if(canvas.width!==ww||canvas.height!==hh){canvas.width=ww;canvas.height=hh;}ctx.setTransform(dpi,0,0,dpi,0,0);
  ctx.clearRect(0,0,w,h);const grad=ctx.createRadialGradient(w*.5,h*.4,25,w*.5,h*.5,Math.max(w,h)*.75);grad.addColorStop(0,cfg.space.night&&mode==='space'?'#071b32':'#113147');grad.addColorStop(1,'#04101f');ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(69,189,233,.15)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(w*.5,h*.55,Math.min(w,h)*.37,0,Math.PI*2);ctx.stroke();
  if(mode==='knowledge'){hover=drawKnowledge(ctx,w,h,state,cfg.orbit,selected,cfg.links);}
  else {drawGrid(ctx,w,h,cfg.orbit);hover=drawMeshScene(ctx,w,h,currentObjects(),cfg.orbit,mode==='engineering'||mode==='ar'?cfg.exploded:0,selected);}
  if(t-lastFps>1500){const status=root.querySelector('#sp-fps');if(status)status.textContent=`${Math.round(1000/(reduced?80:33))} FPS TARGET · ${mode==='knowledge'?'GRAPH':'3D'}`;lastFps=t;}
 };
 raf=requestAnimationFrame(draw);
 function pick(x,y){if(mode==='knowledge'){const list=[...hover].reverse();return list.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).find(h=>Math.hypot(h.x-x,h.y-y)<h.r)?.id||null;}
 const candidates=hover.filter(h=>x>=h.bounds.x1-4&&x<=h.bounds.x2+4&&y>=h.bounds.y1-4&&y<=h.bounds.y2+4).sort((a,b)=>a.depth-b.depth);return candidates[0]?.id||null;}
 function pointerXY(e){const b=canvas.getBoundingClientRect();return {x:e.clientX-b.left,y:e.clientY-b.top};}
 function distance(){const p=[...touches.values()];return p.length<2?0:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y)}
 function down(e){if(disposed)return;const p=pointerXY(e);touches.set(e.pointerId,p);if(touches.size===1)pointerStart={x:p.x,y:p.y,t:Date.now(),moved:false};if(touches.size===2)lastPinchDistance=distance();try{canvas.setPointerCapture(e.pointerId)}catch{}}
 function move(e){if(!touches.has(e.pointerId))return;const p=pointerXY(e),old=touches.get(e.pointerId);touches.set(e.pointerId,p);
 if(touches.size>=2){const d=distance();if(lastPinchDistance>0&&d>0)cfg.orbit.zoom=Math.min(3,Math.max(.45,cfg.orbit.zoom*d/lastPinchDistance));lastPinchDistance=d;if(pointerStart)pointerStart.moved=true;}
 else {cfg.orbit.yaw+=(p.x-old.x)*.008;cfg.orbit.pitch=Math.min(1.15,Math.max(-1.08,cfg.orbit.pitch+(p.y-old.y)*.006));if(pointerStart&&Math.hypot(p.x-pointerStart.x,p.y-pointerStart.y)>9)pointerStart.moved=true;}}
 function up(e){if(!touches.has(e.pointerId))return;const p=pointerXY(e);if(touches.size===1&&pointerStart&&!pointerStart.moved&&Date.now()-pointerStart.t<600){const id=pick(p.x,p.y);if(id)select(id);}touches.delete(e.pointerId);if(!touches.size){pointerStart=null;save();}else{pointerStart=null;lastPinchDistance=0;}}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
 const wheel=e=>{e.preventDefault();cfg.orbit.zoom=Math.max(.45,Math.min(3,cfg.orbit.zoom*(e.deltaY>0?.92:1.08)));save()};canvas.addEventListener('wheel',wheel,{passive:false});
 async function stopCamera(){cancelAnimationFrame(cameraRaf);cameraRaf=0;if(camStream){for(const track of camStream.getTracks())track.stop();camStream=null;}try{landmarker?.close()}catch{}landmarker=null;const video=root.querySelector('#sp-cam-video');if(video){video.pause();video.srcObject=null;video.hidden=true;}const badge=root.querySelector('#sp-camera-badge');if(badge)badge.textContent='ВЫКЛ';const on=root.querySelector('[data-sp="camera-on"]');if(on)on.disabled=false;const off=root.querySelector('[data-sp="camera-off"]');if(off)off.disabled=true;const status=root.querySelector('#sp-cam-status');if(status)status.textContent='Камера остановлена; управление касаниями доступно.';lastHand=null;hadPinch=false;}
 async function startCamera(){const on=root.querySelector('[data-sp="camera-on"]'),off=root.querySelector('[data-sp="camera-off"]'),video=root.querySelector('#sp-cam-video'),status=root.querySelector('#sp-cam-status');if(!navigator.mediaDevices?.getUserMedia){message('Камера недоступна в этом браузере.');return;}
  if(on)on.disabled=true;if(off)off.disabled=false;if(status)status.textContent='Запрос доступа к фронтальной камере…';
  try{camStream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:24}}});
   if(disposed){await stopCamera();return}video.srcObject=camStream;video.hidden=false;await video.play();if(status)status.textContent='Камера запущена. Загружаю распознавание руки (требуется интернет)…';
   const lib=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/vision_bundle.mjs');
   const fileset=await lib.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');
   try{landmarker=await lib.HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:1});}
   catch{landmarker=await lib.HandLandmarker.createFromOptions(fileset,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:1});}
   if(disposed||!camStream){await stopCamera();return;}const badge=root.querySelector('#sp-camera-badge');if(badge)badge.textContent='АКТИВНО';if(status)status.textContent='Покажите руку. Движение вращает сцену; щипок выбирает или разбирает.';
   const loop=t=>{if(disposed||!camStream||!landmarker)return;cameraRaf=requestAnimationFrame(loop);if(t-firstFrame<110||video.readyState<2||video.currentTime===lastMediaTime)return;firstFrame=t;lastMediaTime=video.currentTime;
    try{const result=landmarker.detectForVideo(video,t);const hand=result.landmarks?.[0];if(!hand){lastHand=null;hadPinch=false;return;}
     const wrist=hand[0],thumb=hand[4],index=hand[8];const pinch=Math.hypot(thumb.x-index.x,thumb.y-index.y)<.065;
     if(lastHand){const dx=lastHand.x-wrist.x,dy=wrist.y-lastHand.y;if(Math.abs(dx)<.2&&Math.abs(dy)<.2){cfg.orbit.yaw+=dx*.95;cfg.orbit.pitch=Math.max(-1.1,Math.min(1.15,cfg.orbit.pitch+dy*.65));}}
     lastHand={x:wrist.x,y:wrist.y};if(pinch&&!hadPinch){if(mode==='engineering'||mode==='ar')cfg.exploded=cfg.exploded>.5?0:1;else if(mode==='space')cfg.space.sofa=!cfg.space.sofa;else if(mode==='knowledge'){const hit=pick((1-index.x)*canvas.clientWidth,index.y*canvas.clientHeight);if(hit)select(hit)}renderDetails();save();}hadPinch=pinch;
    }catch(err){console.warn('Hand landmarks:',err);stopCamera();if(status)status.textContent='Распознавание жестов остановилось; используйте касания.';}}
   cameraRaf=requestAnimationFrame(loop);
  }catch(error){console.warn('Gesture unavailable:',error);await stopCamera();if(status)status.textContent='Жесты недоступны: проверьте подключение, разрешение камеры или ограничения iPadOS. Сенсорное управление работает.';}
 }
 const click=async e=>{const btn=e.target.closest('[data-sp]');if(!btn||!root.contains(btn))return;const action=btn.dataset.sp;
 if(action==='mode'){cfg.mode=btn.dataset.mode;cfg.selected=previousSelected[cfg.mode]||'';await save();onRefresh();return;}
 if(action==='toggle-explode'){cfg.exploded=cfg.exploded>.2?0:1;const range=root.querySelector('[data-sp="explode"]');if(range)range.value=cfg.exploded*100;const num=root.querySelector('#sp-explode-number');if(num)num.textContent=`${Math.round(cfg.exploded*100)}%`;btn.textContent=cfg.exploded>.2?'Собрать':'Разобрать всё';save();return;}
 if(action==='space-toggle'){cfg.space[btn.dataset.key]=!cfg.space[btn.dataset.key];btn.classList.toggle('on',cfg.space[btn.dataset.key]);btn.querySelector('b').textContent=cfg.space[btn.dataset.key]?'ВКЛ':'ВЫКЛ';renderDetails();save();return;}
 if(action==='camera-reset'){cfg.orbit={yaw:-.66,pitch:.31,zoom:1};save();return;}
 if(action==='zoom-in'||action==='zoom-out'){cfg.orbit.zoom=Math.max(.45,Math.min(3,cfg.orbit.zoom*(action==='zoom-in'?1.2:.82)));save();return;}
 if(action==='camera-on'){await startCamera();return;}
 if(action==='camera-off'){await stopCamera();return;}
 if(action==='reset-scene'){await resetSpatialDemo();onRefresh();return;}
 if(action==='import-obj'){root.querySelector('#sp-obj-file')?.click();return;}
 if(action==='clear-obj'){imported=null;select('gear-a');onRefresh();return;}
 if(action==='open-record'){const node=currentItems().find(n=>n.id===selected);if(node?.app)onNavigate(node);return;}
 if(action==='remove-link'){cfg.links=cfg.links.filter(l=>!(l.from===btn.dataset.from&&l.to===btn.dataset.to));await save();renderDetails();return;}
 if(action==='add-link'){const target=root.querySelector('#sp-link-target')?.value;if(!target||target===selected)return; if(cfg.links.some(l=>l.from===selected&&l.to===target))return message('Связь уже существует.');cfg.links.push({from:selected,to:target});await save();renderDetails();return;}
 if(action==='remove-note'){cfg.annotations=cfg.annotations.filter(n=>n.id!==btn.dataset.id);await save();renderDetails();return;}
 };
 root.addEventListener('click',click);
 const submit=e=>{if(e.target.id!=='sp-note-form')return;e.preventDefault();const text=root.querySelector('#sp-note-input')?.value.trim().slice(0,600);if(!text)return;if(cfg.annotations.length>=200){message('Лимит заметок к 3D-модели: 200.');return;}cfg.annotations.push({id:makeId(),target:`${mode}:${selected}`,text,at:new Date().toISOString()});save();renderDetails();message('Заметка привязана к детали.');};root.addEventListener('submit',submit);
 const input=e=>{if(e.target.dataset.sp==='explode'){cfg.exploded=Number(e.target.value)/100;const num=root.querySelector('#sp-explode-number');if(num)num.textContent=`${Math.round(cfg.exploded*100)}%`;}};
 root.addEventListener('input',input);
 const change=async e=>{if(e.target.id==='sp-obj-file'&&e.target.files?.[0]){const file=e.target.files[0];try{const mesh=parseOBJ(await file.text());imported={id:'imported-obj',label:file.name.slice(0,70),kind:'custom',customMesh:mesh,pos:[0,0,0],size:[3.2,3.2,3.2],color:'#5fe2b9',detail:'Пользовательская модель OBJ, открыта локально для текущего сеанса.'};select(imported.id);message('OBJ импортирован: '+file.name);}catch(err){message(err.message||'Не удалось прочесть OBJ');}}else if(e.target.dataset.sp==='explode')save();};root.addEventListener('change',change);
 const hidden=()=>{if(document.visibilityState==='hidden')stopCamera()};document.addEventListener('visibilitychange',hidden);
 const unload=()=>stopCamera();window.addEventListener('pagehide',unload);
 return ()=>{disposed=true;cancelAnimationFrame(raf);cancelAnimationFrame(cameraRaf);stopCamera();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('wheel',wheel);root.removeEventListener('click',click);root.removeEventListener('submit',submit);root.removeEventListener('input',input);root.removeEventListener('change',change);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',unload);save();};
}
