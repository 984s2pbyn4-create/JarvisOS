/* JARVIS OS 2.0: local intelligence and immersive command center.
   No hidden tracking, server calls or secret API tokens. */
import {escapeHTML as esc,makeId} from './db.js';

const STORAGE='jarvis-os-v2-memory';
const MAX_MESSAGES=70;
const clean = s=>String(s??'').slice(0,800);
const low = s=>String(s||'').toLocaleLowerCase('ru-RU').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const defaultState=()=>({history:[],routines:[],draft:[{kind:'open',value:'notes'}],speech:false});
let meta=defaultState();
export function readCortex(){
  try{const data=JSON.parse(localStorage.getItem(STORAGE)||'{}');importCortex(data,false)}catch{meta=defaultState()};return meta;
}
export function snapshotCortex(){return {history:meta.history.slice(-MAX_MESSAGES),routines:meta.routines.slice(0,25),speech:!!meta.speech};}
export function importCortex(value,save=true){
  if(!value||typeof value!=='object'||Array.isArray(value))return false;
  const valid=(x)=>x&&typeof x==='object'&&!Array.isArray(x);
  const msgs=Array.isArray(value.history)?value.history.slice(-MAX_MESSAGES).filter(valid).map(x=>({role:x.role==='user'?'user':'assistant',text:clean(x.text).slice(0,800),time:clean(x.time).slice(0,40)})):[];
  const routines=Array.isArray(value.routines)?value.routines.slice(0,25).filter(valid).map(x=>({id:clean(x.id).slice(0,80)||makeId(),name:clean(x.name).slice(0,50),steps:Array.isArray(x.steps)?x.steps.slice(0,6).filter(valid).map(y=>({kind: ['open','task','focus','theme','briefing'].includes(y.kind)?y.kind:'briefing',value:clean(y.value).slice(0,200)})):[]})).filter(x=>x.name&&x.steps.length):[];
  meta={history:msgs,routines,draft:[{kind:'open',value:'notes'}],speech:!!value.speech};if(save)persistCortex();return true;
}
function persistCortex(){try{localStorage.setItem(STORAGE,JSON.stringify(snapshotCortex()))}catch{}}
export function remember(role,text){meta.history.push({role:role==='user'?'user':'assistant',text:clean(text),time:new Date().toISOString()});meta.history=meta.history.slice(-MAX_MESSAGES);persistCortex();}
export function getCortex(){return meta;}
const short=v=>esc(String(v||'').slice(0,76));
const dateFormat=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'дата не указана':d.toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});};
function nextEvents(s){return (s.events||[]).filter(e=>new Date(e.start).getTime()>=Date.now()-60000).sort((a,b)=>String(a.start).localeCompare(String(b.start)));}
export function briefing(s){
 const todos=(s.tasks||[]).filter(t=>!t.done), events=nextEvents(s),inwork=(s.cards||[]).filter(c=>c.column==='doing');
 const lines=[`Сводка на ${new Date().toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}, сэр.`,`${todos.length} активных задач, ${(s.projects||[]).length} проектов, ${(s.notes||[]).length} заметок.`,events.length?`Ближайшее событие: ${events[0].title||'Без названия'}, ${dateFormat(events[0].start)}.`:'В календаре нет предстоящих событий.',inwork.length?`В работе ${inwork.length} карточек: ${inwork.slice(0,2).map(c=>c.title).join('; ')}.`:'На досках нет карточек в статусе «В работе».'];
 if(todos.length)lines.push(`Первая активная задача: ${todos[0].text}.`);
 return lines.join('\n');
}
const tile=(label,value,sub,action,app)=>`<button class="c2-stat" data-action="${action}" ${app?`data-app="${esc(app)}"`:''}><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(sub)}</small></button>`;
export function cortexHome(s){
 const tasks=(s.tasks||[]).filter(x=>!x.done),events=nextEvents(s);
 const upcoming=events[0], progress=(s.cards||[]).filter(x=>x.column==='done').length,total=(s.cards||[]).length;
 const p=Math.round(100*progress/Math.max(1,total));
 return `<div class="c2-home"><div class="c2-gridwash" aria-hidden="true"></div><div class="c2-heading"><span>◈ JARVIS / NEURAL COMMAND INTERFACE</span><span class="c2-live"><i></i> ЛОКАЛЬНЫЙ РЕЖИМ · СИСТЕМА АКТИВНА</span></div>
 <div class="c2-center"><div class="c2-left">
  <div class="c2-mini-label">ПЕРСОНАЛЬНЫЙ АССИСТЕНТ / VERSION 2.0</div>
  <h1>ДОБРО ПОЖАЛОВАТЬ,<br><em>СЭР.</em></h1>
  <p>Система готова к вашим командам. Анализ локальных данных, сценарии и управление рабочими модулями. Всё под вашим контролем.</p>
  <div class="c2-main-actions"><button data-action="cortex-open" class="c2-primary">◈ АКТИВИРОВАТЬ ДЖАРВИСА</button><button data-action="cortex-brief" class="c2-ghost">БРИФИНГ →</button></div>
  <div class="c2-module-pills"><button data-action="open" data-app="atlas">DATA ATLAS ↗</button><button data-action="open" data-app="bridge">МИССИИ ↗</button><button data-action="open" data-app="holodeck">HOLO DECK ↗</button></div>
 </div><div class="c2-orb-shell"><div class="c2-cross x"></div><div class="c2-cross y"></div><canvas id="cortex-orb" aria-label="Интерактивное нейроядро JARVIS. Поверните пальцем." role="img"></canvas><div class="c2-orb-tag c2-orb-tag1">CORTEX <b>ONLINE</b></div><div class="c2-orb-tag c2-orb-tag2">NEURAL LINK / LOCAL</div><button class="c2-orb-button" data-action="cortex-open" aria-label="Открыть ассистента">J</button></div>
 <div class="c2-right"><div class="c2-side-head">СИСТЕМНЫЕ ДАННЫЕ <span>LIVE</span></div>
 ${tile('АКТИВНЫЕ ЗАДАЧИ',String(tasks.length).padStart(2,'0'),tasks[0]?.text||'Задач нет','open','tasks')}
 ${tile('ПРОЕКТЫ',String((s.projects||[]).length).padStart(2,'0'),`${progress}/${total} карточек завершено`,'open','projects')}
 ${tile('БЛИЖАЙШЕЕ СОБЫТИЕ',upcoming?dateFormat(upcoming.start):'—',upcoming?.title||'Событий нет','open','calendar')}
 <div class="c2-completion"><div><span>СТАТУС МИССИЙ</span><strong>${p}%</strong></div><div class="c2-meter"><span style="width:${p}%"></span></div><small>Выполненные карточки проектов</small></div>
 </div></div>
 <div class="c2-bottom"><div><span>БЫСТРЫЕ СЦЕНАРИИ</span><strong>Что выполнить, сэр?</strong></div>
 <button data-action="cortex-scene" data-id="morning"><span>01</span> Обзор дня ↗</button><button data-action="cortex-scene" data-id="work"><span>02</span> Режим работы ↗</button><button data-action="cortex-scene" data-id="mission"><span>03</span> Состояние миссий ↗</button><button data-action="cortex-scene" data-id="creative"><span>04</span> Режим вдохновения ↗</button></div>
 <div class="c2-footnote">JARVIS 2.0 работает локально. Это сценарный ассистент с доступом к данным JARVIS, а не облачная генеративная модель.</div>
 </div>`;
}
export function cortexView(s){
 const history=meta.history;
 return `<div class="c2-app"><div class="c2-app-head"><div><div class="c2-mini-label">CORTEX / INTERACTIVE ASSISTANT</div><h2>ДЖАРВИС <span class="c2-cyan">НА СВЯЗИ</span></h2><p>Контекстные команды · ваши задачи и события · локальная память диалога</p></div><div class="c2-core-small">J</div></div>
 <div class="c2-quickbar">${[['Подготовь брифинг','Подготовь брифинг'],['Покажи задачи','Какие у меня задачи?'],['Что с проектами?','Что с проектами?'],['Что сегодня?','Что сегодня в календаре?']].map(([name,query])=>`<button data-action="cortex-quick" data-query="${esc(query)}">${esc(name)}</button>`).join('')}</div>
 <div id="c2-thread" class="c2-thread" role="log" aria-live="polite">${history.length?history.map(m=>`<div class="c2-bubble ${m.role==='user'?'human':'machine'}"><small>${m.role==='user'?'ВЫ':'JARVIS'} · ${new Date(m.time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</small><p>${esc(m.text)}</p></div>`).join(''):`<div class="c2-welcome"><div>◈</div><strong>Канал интеллектуального управления активен</strong><p>«Что сегодня по плану?», «Добавь задачу проверить проект», «Открой аудио», «Создай заметку идея для проекта».</p></div>`}</div>
 <form id="c2-chat-form" class="c2-chat"><input id="c2-prompt" maxlength="480" autocomplete="off" placeholder="Введите команду или вопрос…" aria-label="Сообщение ассистенту" required/><button type="submit">ОТПРАВИТЬ ↗</button></form>
 <div class="c2-hints"><span>● ЛОКАЛЬНЫЙ ДВИЖОК, НЕ ОБЛАЧНЫЙ ИИ</span><button data-action="cortex-speak-last">🔊 Озвучить последний ответ</button><button data-action="cortex-clear">Очистить диалог</button></div></div>`;
}
const types=[['open','Открыть модуль'],['task','Добавить задачу'],['focus','Запустить Фокус'],['theme','Сменить тему'],['briefing','Показать брифинг']];
function stepFields(step,i){const selected=types.find(x=>x[0]===step.kind)?.[0]||'open';const choices=selected==='open'?[['notes','Заметки'],['tasks','Задачи'],['projects','Проекты'],['calendar','Календарь'],['audio','Audio Lab'],['bridge','Mission Control'],['holodeck','HOLO DECK'],['vault','Файлы'],['cortex','Джарвис'],['focus','Фокус']]:selected==='theme'?[['blue','Голубая'],['amber','Янтарная'],['mint','Мятная']]:selected==='focus'?[['15','15 минут'],['25','25 минут'],['45','45 минут'],['60','60 минут']]:null;
 return `<div class="c2-step"><span>${String(i+1).padStart(2,'0')}</span><select data-c2-index="${i}" data-c2-field="kind" aria-label="Тип действия">${types.map(([k,n])=>`<option value="${k}" ${selected===k?'selected':''}>${n}</option>`).join('')}</select>${choices?`<select data-c2-index="${i}" data-c2-field="value" aria-label="Параметр действия">${choices.map(([v,n])=>`<option value="${v}" ${step.value===v?'selected':''}>${n}</option>`).join('')}</select>`:selected==='task'?`<input data-c2-index="${i}" data-c2-field="value" maxlength="200" value="${esc(step.value||'')}" placeholder="Текст задачи"/>`:`<span class="c2-step-noargs">Автоматическая сводка</span>`}<button data-action="cortex-remove-step" data-id="${i}" aria-label="Удалить шаг">×</button></div>`;
}
export function routinesView(){return `<div class="c2-app c2-routines"><div class="c2-app-head"><div><div class="c2-mini-label">WORKFLOW AUTOMATION</div><h2>СЦЕНАРИИ <span class="c2-cyan">УПРАВЛЕНИЯ</span></h2><p>Реальные действия внутри JARVIS без доступа к системе iPadOS.</p></div></div>
 <div class="c2-routine-grid"><div class="c2-routine-card"><strong>ПРЕДУСТАНОВЛЕННЫЕ</strong>${[['morning','Обзор дня','Сводка задач, событий и проектов'],['work','Рабочий режим','Две панели и таймер концентрации'],['mission','Контроль миссий','Статус проектов и открытые задачи'],['creative','Вдохновение','Переход в HOLO DECK']].map(([id,n,d])=>`<button data-action="cortex-scene" data-id="${id}"><span><b>${n}</b><small>${d}</small></span>↗</button>`).join('')}</div><div class="c2-routine-card"><strong>ВАШИ СЦЕНАРИИ</strong>${meta.routines.length?meta.routines.map(r=>`<div class="c2-ownroutine"><button data-action="cortex-run-routine" data-id="${esc(r.id)}"><span><b>${esc(r.name)}</b><small>${r.steps.length} действ.</small></span>▶</button><button data-action="cortex-delete-routine" data-id="${esc(r.id)}" aria-label="Удалить сценарий">×</button></div>`).join(''):'<p>Добавьте собственный сценарий из нескольких действий.</p>'}</div></div>
 <section class="c2-builder"><div class="c2-mini-label">НОВЫЙ СЦЕНАРИЙ</div><input id="c2-routine-name" maxlength="50" placeholder="Например: подготовка к записи" aria-label="Имя сценария"/><div class="c2-steps">${meta.draft.map(stepFields).join('')}</div><div class="c2-builder-actions"><button data-action="cortex-add-step" class="secondary-btn">+ Добавить действие</button><button data-action="cortex-save-routine" class="primary-btn">СОХРАНИТЬ СЦЕНАРИЙ</button></div></section><p class="c2-footnote">Сценарии не запускаются в фоне и не имеют системных привилегий. Запуск только после вашего касания.</p></div>`;}

export function changeDraft(index,field,value){const step=meta.draft[index];if(!step)return;if(field==='kind'){step.kind=types.some(x=>x[0]===value)?value:'open';step.value={open:'notes',task:'',focus:'25',theme:'blue',briefing:''}[step.kind];}else if(field==='value')step.value=clean(value).slice(0,200);}
export function addDraft(){if(meta.draft.length<6)meta.draft.push({kind:'open',value:'notes'});}
export function removeDraft(i){if(meta.draft.length>1)meta.draft.splice(i,1);}
export function saveRoutine(name){name=clean(name).trim().slice(0,50);if(!name)return {ok:false,message:'Введите название сценария'};if(meta.routines.length>=25)return {ok:false,message:'Достигнут лимит 25 сценариев'};if(meta.draft.some(x=>x.kind==='task'&&!x.value.trim()))return {ok:false,message:'Заполните текст каждой задачи'};meta.routines.push({id:makeId(),name,steps:meta.draft.map(x=>({...x}))});meta.draft=[{kind:'open',value:'notes'}];persistCortex();return {ok:true,message:'Сценарий сохранён'};}
export function deleteRoutine(id){meta.routines=meta.routines.filter(r=>r.id!==id);persistCortex();}
export function getRoutine(id){return meta.routines.find(r=>r.id===id);}
export function clearCortex(){meta.history=[];persistCortex();}

function searchLocal(q,s){const words=low(q).split(' ').filter(w=>w.length>=3);if(!words.length)return[];const results=[];
 for(const n of s.notes||[])if(words.some(w=>low(`${n.title} ${n.body}`).includes(w)))results.push(`Заметка: ${n.title||'Без названия'}`);
 for(const n of s.tasks||[])if(words.some(w=>low(n.text).includes(w)))results.push(`Задача: ${n.text}${n.done?' (выполнена)':''}`);
 for(const e of s.events||[])if(words.some(w=>low(`${e.title} ${e.notes}`).includes(w)))results.push(`Событие: ${e.title}, ${dateFormat(e.start)}`);
 for(const p of s.projects||[])if(words.some(w=>low(`${p.title} ${p.description}`).includes(w)))results.push(`Проект: ${p.title}`);
 return results.slice(0,5);
}
// Deterministic intent engine: strictly grounded in available local records.
export function planResponse(raw,s){const q=low(raw);if(!q)return {text:'Слушаю, сэр.',action:null};
 if(/^(привет|здравствуй|джарвис|jarvis)$/.test(q))return {text:'На связи, сэр. Все локальные системы готовы. Могу подготовить брифинг, найти информацию, открыть модуль или создать задачу.',action:null};
 if(/(брифинг|сводк|обзор дня|как обстоят дела|доложи|расскажи о состоянии|отчет|отчёт)/.test(q))return {text:briefing(s),action:null};
 const task=q.match(/(?:создай|создать|добавь|запиши|поставь)\s+(?:мне\s+)?задачу\s+(.+)/);
 if(task)return {text:`Добавляю задачу: ${task[1].slice(0,200)}.`,action:{kind:'task',value:task[1]}};
 const note=q.match(/(?:создай|создать|запиши|добавь)\s+(?:мне\s+)?заметку\s+(.+)/);
 if(note)return {text:`Создаю заметку «${note[1].slice(0,80)}».`,action:{kind:'note',value:note[1]}};
 if(/(какие|покажи|сколько|остались|проверь|мои)\s+.*(задач|дела)|задачи\??$/.test(q)){
  const items=(s.tasks||[]).filter(x=>!x.done);
  return {text:items.length?`Незавершённых задач: ${items.length}.\n${items.slice(0,6).map((x,i)=>`${i+1}. ${x.text}`).join('\n')}`:'Все задачи выполнены или список пуст, сэр.',action:null};
 }
 if(/(проект|мисси|канбан)/.test(q)&&!/(открой|запусти)/.test(q)){
  const ps=s.projects||[], cards=s.cards||[];
  return {text:ps.length?`Проектов: ${ps.length}.\n${ps.slice(0,6).map(p=>`${p.title}: ${cards.filter(c=>c.projectId===p.id&&c.column==='doing').length} в работе, ${cards.filter(c=>c.projectId===p.id&&c.column==='done').length} завершено`).join('\n')}`:'Проектов пока нет. Можно создать первый в модуле «Проекты».',action:null};
 }
 if(/(календар|событи|встреч|сегодня|завтра)/.test(q)&&!/(открой|запусти)/.test(q)){
  const future=nextEvents(s),today=new Date().toDateString();const onlyToday=/сегодня/.test(q);
  const items=onlyToday?future.filter(e=>new Date(e.start).toDateString()===today):future;
  return {text:items.length?`${onlyToday?'Сегодня':'Предстоящие события'}:\n${items.slice(0,6).map(e=>`• ${e.title}, ${dateFormat(e.start)}`).join('\n')}`:onlyToday?'На сегодня запланированных событий нет.':'Ближайших событий не найдено.',action:null};
 }
 if(/(файл|документ|хранилищ)/.test(q)&&!/(открой|запусти)/.test(q))return {text:`В локальном хранилище ${(s.vault||[]).length} файлов. Открыть файловый менеджер? Скажите «открой файлы».`,action:null};
 if(/(время|который час)/.test(q))return {text:`Сейчас ${new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}.`,action:null};
 if(/(настрой|как ты устроен|ты настоящий|ты ии|ты искусственный)/.test(q))return {text:'Я локальный ассистент JARVIS OS 2.0 с распознаванием команд и поиском в ваших данных. Без подключения внешнего ИИ-сервиса я не являюсь генеративной языковой моделью. Документы и заметки остаются на iPad.',action:null};
 if(/(запусти|начни|включи)\s+(фокус|помодоро)/.test(q))return {text:'Запускаю 25-минутную сессию фокуса.',action:{kind:'focus',value:'25'}};
 if(/^(открой|запусти|покажи|перейди в)\s+/.test(q)){
  const target=q.replace(/^(открой|запусти|покажи|перейди в)\s+/,'');
  const aliases=[['cortex',/джарвис|ассистент|интеллект/],['atlas',/атлас|карт[ау] данных/],['routines',/сценари|автоматизац/],['notes',/замет/],['tasks',/задач|дела/],['projects',/проект|канбан/],['calendar',/календар|событи/],['vault',/файл|хранилищ/],['focus',/фокус|таймер/],['audio',/аудио|музык|звуков/],['bridge',/мостик|мисси|полет/],['holodeck',/голограм|холо|космос/],['settings',/настрой/]];
  const found=aliases.find(([,re])=>re.test(target));
  return found?{text:`Открываю ${found[0] === 'cortex'?'панель ассистента':target}, сэр.`,action:{kind:'open',value:found[0]}}:{text:'Не нахожу такой модуль. Откройте каталог приложений или назовите модуль точнее.',action:null};
 }
 if(/(сценари|режим работы)/.test(q))return {text:'Открываю конструктор сценариев. Здесь можно объединить действия в одну команду.',action:{kind:'open',value:'routines'}};
 const results=searchLocal(q,s);
 if(results.length)return {text:`Нашёл совпадения в ваших данных:\n${results.join('\n')}\nДля полного поиска откройте модуль «Поиск».`,action:null};
 return {text:'Не могу надёжно определить действие по этой фразе, сэр. Доступны брифинг, поиск по данным, задачи, заметки, проекты, календарь и открытие модулей. Для свободного диалога нужен отдельный подключённый ИИ-сервис.',action:null};
}

// Controlled animation with canvas 2D; everything is drawn locally at <=30 FPS.
export function initCortexOrb(canvas,{reduced=false}={}){
 if(!canvas)return ()=>{};
 const ctx=canvas.getContext('2d');if(!ctx)return ()=>{};
 let raf=0,disposed=false,w=0,h=0,last=0,rotation=0,tilt=.2,drag=null;
 const rand=(i,seed)=>{let x=Math.sin(i*12.9898+seed*78.233)*43758.5453;return x-Math.floor(x)};
 const stars=Array.from({length:150},(_,i)=>[rand(i,1),rand(i,2),rand(i,3)]);
 function resize(){const box=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);w=Math.max(1,box.width);h=Math.max(1,box.height);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;ro?.observe(canvas);resize();
 function paint(time){if(disposed||document.hidden)return;raf=requestAnimationFrame(loop);const W=w,H=h,cx=W/2,cy=H/2,r=Math.min(W,H)*.33;
  ctx.clearRect(0,0,W,H);
  for(const [sx,sy,br] of stars){const opacity=.09+br*.43;ctx.fillStyle=`rgba(155,221,250,${opacity})`;ctx.fillRect(sx*W,sy*H,br>.8?1.5:1,br>.8?1.5:1);}
  const glow=ctx.createRadialGradient(cx,cy,10,cx,cy,r*1.5);glow.addColorStop(0,'rgba(40,189,252,.17)');glow.addColorStop(.5,'rgba(32,124,211,.07)');glow.addColorStop(1,'rgba(14,55,105,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,r*1.5,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.translate(cx,cy);ctx.rotate(tilt*.15);
  for(let k=0;k<4;k++){ctx.save();ctx.rotate(rotation*(k%2?-1:1)*(.21+.05*k)+k*.72);ctx.scale(1,.25+.19*k);ctx.beginPath();ctx.arc(0,0,r*(.82+k*.09),0,Math.PI*2);ctx.strokeStyle=['rgba(78,215,252,.65)','rgba(119,157,255,.37)','rgba(72,215,222,.31)','rgba(82,166,246,.18)'][k];ctx.lineWidth=k===0?2:1;ctx.setLineDash(k===2?[5,9]:[]);ctx.stroke();ctx.restore();}
  for(let lat=-75;lat<=75;lat+=15){const ry=Math.sin(lat*Math.PI/180)*r*.77;const rx=Math.cos(lat*Math.PI/180)*r*.77;ctx.beginPath();ctx.ellipse(0,ry,Math.max(1,rx),Math.max(1,rx*.18),rotation*.12,0,Math.PI*2);ctx.strokeStyle='rgba(67,210,255,.10)';ctx.stroke();}
  for(let i=0;i<76;i++){const a=i*Math.PI*2/76+rotation*(.32+i%3*.03),b=(i%19/19-.5)*Math.PI,depth=Math.cos(a)*Math.cos(b),x=Math.sin(a)*Math.cos(b)*r*.82,y=Math.sin(b+tilt*.22)*r*.74;ctx.beginPath();ctx.arc(x,y,1.2+Math.max(0,depth)*1.7,0,Math.PI*2);ctx.fillStyle=`rgba(95,224,255,${.23+Math.max(0,depth)*.7})`;ctx.fill();}
  const core=ctx.createRadialGradient(0,0,1,0,0,r*.45);core.addColorStop(0,'rgba(214,252,255,.87)');core.addColorStop(.1,'rgba(115,228,255,.54)');core.addColorStop(.4,'rgba(18,129,215,.18)');core.addColorStop(1,'rgba(27,93,178,0)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(0,0,r*.45,0,Math.PI*2);ctx.fill();
  ctx.restore();
 }
 function loop(time){if(disposed)return;if(time-last<33){raf=requestAnimationFrame(loop);return;}last=time;if(!drag&&!reduced)rotation+=.008;paint(time);}
 function down(e){drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}
 function move(e){if(!drag)return;rotation+=(e.clientX-drag.x)*.009;tilt=Math.max(-2,Math.min(2,tilt+(e.clientY-drag.y)*.004));drag={x:e.clientX,y:e.clientY};}
 function up(){drag=null;}
 const vis=()=>{if(!document.hidden&&!disposed){cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}else cancelAnimationFrame(raf);};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);document.addEventListener('visibilitychange',vis);raf=requestAnimationFrame(loop);
 return ()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();document.removeEventListener('visibilitychange',vis);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);};
}
