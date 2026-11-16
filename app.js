import {store, makeId, escapeHTML as esc, fileSize, exportBackup, prepareBackup, commitBackup} from './db.js';
import {calendarView, projectsView, focusView, searchView, searchResults, todayKey, nextEvent, clockValue} from './productivity.js';
import {icon as I} from './icons.js';
import {initHologram} from './hologram.js';
import {interpretCommand} from './commands.js';
import {createVoiceController} from './voice.js';

const VERSION='1.0.0';
const modules=[
  {id:'notes',name:'Заметки',description:'Личные записи и идеи',glyph:'note',group:'Работа'},
  {id:'calendar',name:'Календарь',description:'События и встречи офлайн',glyph:'calendar',group:'Работа'},
  {id:'projects',name:'Проекты',description:'Доски задач и рабочие планы',glyph:'layers',group:'Работа'},
  {id:'focus',name:'Фокус',description:'Таймер концентрации',glyph:'target',group:'Инструменты'},
  {id:'search',name:'Поиск',description:'Поиск по всем вашим данным',glyph:'search',group:'Инструменты'},
  {id:'tasks',name:'Задачи',description:'Планы и контроль дел',glyph:'tasks',group:'Работа'},
  {id:'vault',name:'Файлы',description:'Локальное хранилище',glyph:'folder',group:'Данные'},
  {id:'audio',name:'Audio Lab',description:'Просмотр и анализ звука',glyph:'audio',group:'Творчество'},
  {id:'calculator',name:'Калькулятор',description:'Быстрые вычисления',glyph:'calculator',group:'Инструменты'},
  {id:'clock',name:'Хронометр',description:'Время и дата',glyph:'clock',group:'Инструменты'},
  {id:'diagnostics',name:'Диагностика',description:'Возможности устройства',glyph:'shield',group:'Система'},
  {id:'settings',name:'Настройки',description:'Персонализация и резерв',glyph:'settings',group:'Система'}
];
const byId=id=>modules.find(m=>m.id===id);
const $=sel=>document.querySelector(sel);
const isAppleTablet=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const isStandalone=!!(navigator.standalone||window.matchMedia('(display-mode: standalone)').matches);
const savedSettings=(()=>{try{return JSON.parse(localStorage.getItem('jarvis-os-settings')||'{}')}catch{return{}}})();
const previousSplitRatio=(()=>{try{return Number(localStorage.getItem('jarvis-split-ratio'))||52}catch{return 52}})();
function loadFocus(){try{const x=JSON.parse(localStorage.getItem('jarvis-focus-v1')||'{}');if([15,25,45,60].includes(x.duration))return {duration:x.duration,remainingMs:Math.max(0,Number(x.remainingMs)||x.duration*60000),endsAt:Number(x.endsAt)||0,running:!!x.running,completed:Math.max(0,Number(x.completed)||0)};}catch{}return {duration:25,remainingMs:25*60000,endsAt:0,running:false,completed:0};}
function saveFocus(){try{localStorage.setItem('jarvis-focus-v1',JSON.stringify(state.focus));}catch{}}
const helpers={I,esc};
const state={
  theme:['blue','amber','mint'].includes(savedSettings.theme)?savedSettings.theme:'blue',
  motion:!!savedSettings.motion,voiceCompat:typeof savedSettings.voiceCompat==='boolean'?savedSettings.voiceCompat:(isAppleTablet&&isStandalone),
  voiceQuickEnd:false,
  notes:[],tasks:[],vault:[],events:[],projects:[],cards:[],active:null,tabs:[],selectedNote:null,
  calendarDay:todayKey(),calendarMonth:todayKey().slice(0,7),editingEvent:null,selectedProject:null,searchQuery:'',
  focus:loadFocus(),
  command:false,query:'',recent:[],calc:'0',audioUrl:null,audioName:null,
  audioCtx:null,analyser:null,audioSource:null,audioFrame:0,
  loaded:false,storageOkay:true,modal:null,secondary:null,splitPicker:false,focusedPane:'primary',splitRatio:previousSplitRatio
};
const dateTime=()=>new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
const dateText=()=>new Date().toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
const formatDate=v=>{try{return new Date(v).toLocaleDateString('ru-RU',{day:'2-digit',month:'short'})}catch{return ''}};
const nowISO=()=>new Date().toISOString();
function saveSettings(){try{localStorage.setItem('jarvis-os-settings',JSON.stringify({theme:state.theme,motion:state.motion,voiceCompat:state.voiceCompat,voiceQuickEnd:state.voiceQuickEnd}))}catch{}document.documentElement.dataset.theme=state.theme;document.documentElement.dataset.motion=state.motion?'reduced':'normal';}
function toast(message){const slot=$('.toast-stack');if(!slot)return;const div=document.createElement('div');div.className='toast';div.textContent=message;slot.append(div);setTimeout(()=>div.remove(),4400);}
const voice=createVoiceController({
  onStatus:({stage,message})=>{
    const status=$('#voice-status');if(status)status.textContent=message;
    const diag=$('#voice-log-text');if(diag)diag.value=voice.getDiagnosticText();
    const button=$('[data-action="mic"]');
    if(button){button.classList.toggle('voice-active',stage!=='idle');button.setAttribute('aria-pressed',String(stage!=='idle'));button.title=stage==='idle'?'Начать голосовую команду':'Отменить голосовой ввод';}
  },
  onCommand:text=>{
    state.query=text;
    const input=$('#command-field');if(input)input.value=text;
    executeCommand(text).catch(()=>toast('Ошибка выполнения голосовой команды'));
  }
});
function statusLabel(){return navigator.onLine?'СЕТЬ ДОСТУПНА':'АВТОНОМНЫЙ РЕЖИМ';}
function totalTasks(){return state.tasks.filter(x=>!x.done).length;}
function weekdayGreeting(){const h=new Date().getHours();return h<6?'Доброй ночи, сэр':h<12?'Доброе утро, сэр':h<18?'Добрый день, сэр':'Добрый вечер, сэр';}
function navItem(id,glyph,title){return `<button class="nav-button ${state.active===id?'active':''}" data-action="${id==='home'?'home':id==='apps'?'show-apps':'open'}" ${id==='home'||id==='apps'?'':`data-app="${id}"`} title="${esc(title)}" aria-label="${esc(title)}">${I(glyph,23)}</button>`;}
function dockItem(id,glyph,title){const action=id==='home'?'home':id==='apps'?'show-apps':id==='command'?'command':'open';return `<button class="dock-item ${state.active===id?'active':''}" data-action="${action}" ${action==='open'?`data-app="${id}"`:''} aria-label="${esc(title)}" title="${esc(title)}">${I(glyph,23)}<span class="dock-tip">${esc(title)}</span></button>`;}
function topbar(){return `<header class="topbar"><div class="brand"><div class="brand-emblem" aria-hidden="true">J</div><div><div class="brand-title">JARVIS <span style="color:var(--accent)">OS</span></div><div class="brand-sub">IPAD EDITION · V${VERSION}</div></div></div><div class="topbar-center"><span class="pulse-dot ${navigator.onLine?'':'offline'}"></span> <span id="status-network">${statusLabel()}</span><span style="color:var(--dim)">/</span> PRIVATE WORKSPACE</div><div class="topbar-actions"><button class="search-trigger" data-action="command" aria-label="Командный поиск">${I('search',17)}<span>Найти или выполнить</span><kbd>⌘ K</kbd></button><span class="header-divider"></span><span class="clock-top live-clock">${dateTime()}</span><button class="icon-button" data-action="open" data-app="settings" aria-label="Настройки">${I('settings',20)}</button></div></header>`;}
function sidebar(){return `<aside class="sidebar" aria-label="Навигация"><div class="sidebar-label">НАВИГАЦИЯ</div>${navItem('home','home','Главная')}${navItem('apps','apps','Приложения')}${navItem('notes','note','Заметки')}${navItem('tasks','tasks','Задачи')}${navItem('calendar','calendar','Календарь')}${navItem('projects','layers','Проекты')}${navItem('vault','folder','Файлы')}<div class="side-spacer"></div>${navItem('settings','settings','Настройки')}</aside>`;}
function dock(){return `<nav class="dock" aria-label="Панель быстрого запуска">${dockItem('home','home','Главная')}${dockItem('apps','apps','Все приложения')}<span class="dock-separator"></span>${dockItem('notes','note','Заметки')}${dockItem('tasks','tasks','Задачи')}${dockItem('calendar','calendar','Календарь')}${dockItem('projects','layers','Проекты')}${dockItem('vault','folder','Файлы')}<span class="dock-separator"></span>${dockItem('command','spark','Команды')}</nav>`;}
function moduleCard(id){const m=byId(id);return `<button class="module-card" data-action="open" data-app="${id}"><div style="display:flex;justify-content:space-between;width:100%"><div class="module-icon">${I(m.glyph,23)}</div><span class="module-arrow">${I('arrow',17)}</span></div><div><h3>${m.name}</h3><p>${m.description}</p></div></button>`;}
function home(){const todo=totalTasks();const done=state.tasks.length-todo;const pct=state.tasks.length?Math.round(done/state.tasks.length*100):0;return `<section class="dashboard"><div class="welcome-row"><div><span class="overline">PERSONAL COMMAND CENTER</span><h1>${weekdayGreeting()}</h1><div class="subtext">Все системы готовы к работе. Ваше пространство под контролем.</div></div><div class="version-pill"><span class="pulse-dot"></span> ЛОКАЛЬНАЯ СИСТЕМА · V${VERSION}</div></div>
<div class="telemetry-grid">
 <div class="telemetry-card"><span class="telemetry-label">СЕТЬ / CONNECTION</span><strong><span class="pulse-dot ${navigator.onLine?'':'offline'}"></span> ${navigator.onLine?'ONLINE':'OFFLINE'}</strong><small>Локальные приложения доступны</small></div>
 <button class="telemetry-card telemetry-action" data-action="open" data-app="clock"><span class="telemetry-label">ЛОКАЛЬНОЕ ВРЕМЯ</span><strong class="live-clock">${dateTime()}</strong><small class="live-date">${dateText()}</small></button>
 <button class="telemetry-card telemetry-action" data-action="open" data-app="tasks"><span class="telemetry-label">ОТКРЫТЫЕ ЗАДАЧИ</span><strong>${totalTasks().toString().padStart(2,'0')}</strong><small>Нажмите, чтобы открыть</small></button>
 <button class="telemetry-card telemetry-action" data-action="command"><span class="telemetry-label">ASSISTANT / КОМАНДЫ</span><strong>JARVIS <span style="color:var(--accent)">READY</span></strong><small>Например: «открой заметки»</small></button>
</div><div class="dash-grid"><div class="panel core-panel"><div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div><div class="core-caption">CORE SYSTEM <strong>OPERATIONAL</strong></div><button class="core-art" data-action="command" title="Открыть командный центр" aria-label="Командный центр" style="border:0;background:transparent;color:inherit"><canvas id="holo-canvas" class="holo-canvas" aria-hidden="true"></canvas><span class="ring outer"></span><span class="ring mid"></span><span class="ring inner"></span><span class="core-center"><strong>J</strong><small>ACTIVE</small></span></button><div class="core-bottom"><span>JARVIS / TOUCH INTERFACE <b>READY</b></span><span class="signal"><i></i><i></i><i></i><i></i><i></i></span></div></div>
<div class="stats-col"><button data-action="open" data-app="tasks" class="panel stat-panel" style="color:var(--text);text-align:left"><div class="panel-head"><span class="panel-index">01 / ЗАДАЧИ</span>${I('tasks',20)}</div><div><div class="stat-big">${String(todo).padStart(2,'0')} <span class="stat-unit">активных</span></div><div class="stat-hint">${state.tasks.length ? `Выполнено: ${done} из ${state.tasks.length}` : 'Добавьте первую задачу'}</div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div></button>
<button data-action="open" data-app="notes" class="panel stat-panel" style="color:var(--text);text-align:left"><div class="panel-head"><span class="panel-index">02 / ЗАПИСИ</span>${I('note',20)}</div><div><div class="stat-big">${String(state.notes.length).padStart(2,'0')} <span class="stat-unit">заметок</span></div><div class="stat-hint">Локально на этом устройстве</div></div></button></div></div>
<div class="section-title"><h2>БЫСТРЫЙ ЗАПУСК <span style="font-size:10px;color:var(--dim);font-weight:400;margin-left:9px">/ APPLICATIONS</span></h2><button class="text-link" data-action="show-apps">Все модули ${I('chevron',15)}</button></div><div class="module-grid">${['notes','tasks','calendar','projects','focus','audio'].map(moduleCard).join('')}</div><div class="dashboard-upcoming"><div>${I('calendar',18)}<span><strong>Следующее событие</strong><small>${nextEvent(state.events)?esc(nextEvent(state.events).title)+' · '+new Date(nextEvent(state.events).start).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Пока нет событий'}</small></span></div><button class="secondary-btn" data-action="open" data-app="calendar">Календарь ${I('arrow',14)}</button></div><div class="footer-note">${I('shield',13)} Данные сохраняются на этом устройстве. Регулярно создавайте резервную копию в настройках.</div></section>`;}
function allApps(){return `<div class="view-intro"><div><h2>Приложения</h2><p>Модули JARVIS OS. Нажмите, чтобы открыть.</p></div><span class="version-pill">${modules.length} MODULES</span></div><div class="allapps">${modules.map(m=>`<button class="app-tile" data-action="open" data-app="${m.id}"><div class="module-icon">${I(m.glyph,22)}</div><div><h3>${m.name}</h3><p>${m.description}</p></div></button>`).join('')}</div>`;}
function notesView(){const selected=state.notes.find(x=>x.id===state.selectedNote);return `<div class="view-intro"><div><h2>Заметки</h2><p>Ваши идеи сохраняются автоматически на iPad.</p></div><button class="primary-btn" data-action="new-note">${I('plus',16)} Новая заметка</button></div><div class="two-column"><div class="list-pane">${state.notes.length?state.notes.map(n=>`<button data-action="select-note" data-id="${esc(n.id)}" class="list-row ${n.id===state.selectedNote?'selected':''}"><span><strong>${esc(n.title||'Без названия')}</strong><small>${esc((n.body||'').slice(0,50))||'Пустая заметка'}</small></span>${I('chevron',14)}</button>`).join(''):`<div class="empty-state" style="min-height:180px">${I('note',25)}<strong>Записей пока нет</strong><span class="small">Создайте первую заметку</span></div>`}</div>${selected?`<div class="note-editor"><input id="note-title" class="title-field" aria-label="Заголовок заметки" placeholder="Заголовок" value="${esc(selected.title)}"/><textarea id="note-body" aria-label="Текст заметки" placeholder="Начните печатать...">${esc(selected.body)}</textarea><div class="editor-footer"><span class="muted small">${I('check',13)} <span id="note-save-status">Автосохранение</span></span><button class="danger-btn" data-action="delete-note" data-id="${esc(selected.id)}">${I('trash',16)} Удалить</button></div></div>`:`<div class="empty-state">${I('pen',30)}<strong>Рабочее поле свободно</strong><span class="small">Выберите заметку или создайте новую</span></div>`}</div>`;}
function tasksView(){const remaining=totalTasks();return `<div class="view-intro"><div><h2>Мои задачи</h2><p>Активных: ${remaining}. Выполненных: ${state.tasks.length-remaining}.</p></div></div><div class="task-entry"><input id="task-field" class="field" placeholder="Например: подготовить план проекта" aria-label="Новая задача" maxlength="400"/><button class="primary-btn" data-action="add-task">${I('plus',16)} Добавить</button></div>${state.tasks.length?state.tasks.map(t=>`<div class="task-item"><button class="task-check ${t.done?'done':''}" data-action="toggle-task" data-id="${esc(t.id)}" aria-label="${t.done?'Отметить невыполненной':'Отметить выполненной'}">${t.done?I('check',16):''}</button><div class="task-copy ${t.done?'done':''}">${esc(t.text)}<div class="task-meta">${formatDate(t.created)}</div></div><button class="icon-button" data-action="delete-task" data-id="${esc(t.id)}" aria-label="Удалить задачу">${I('trash',17)}</button></div>`).join(''):`<div class="empty-state">${I('tasks',29)}<strong>Список задач пуст</strong><span class="small">Добавьте задачу, и JARVIS сохранит её локально</span></div>`}`;}
function vaultView(){return `<div class="view-intro"><div><h2>Локальные файлы</h2><p>Ваши файлы находятся в хранилище этого браузера, не на сервере.</p></div><button class="primary-btn" data-action="upload-file">${I('upload',17)} Импорт файлов</button></div><input type="file" id="vault-input" hidden multiple/><div class="file-grid">${state.vault.map(f=>`<div class="file-card"><div class="file-symbol">${I(f.type?.startsWith('image/')?'image':'folder',33)}</div><strong title="${esc(f.name)}">${esc(f.name)}</strong><small>${fileSize(f.size)} · ${formatDate(f.created)}</small><div class="actions"><button class="secondary-btn" data-action="download-file" data-id="${esc(f.id)}" aria-label="Скачать файл">${I('download',15)}</button><button class="danger-btn" data-action="delete-file" data-id="${esc(f.id)}" aria-label="Удалить файл">${I('trash',15)}</button></div></div>`).join('')}</div>${state.vault.length?'':`<div class="empty-state">${I('folder',30)}<strong>Здесь пока нет файлов</strong><span class="small">Импортируйте документы, изображения или аудио с iPad</span></div>`}<div class="footer-note">${I('info',14)} Для важных файлов сохраняйте оригиналы в приложении «Файлы» или другом надёжном месте.</div>`;}
function audioView(){return `<div class="view-intro"><div><h2>Audio Lab</h2><p>Локальное воспроизведение и частотный анализ через Web Audio API.</p></div><span class="version-pill">NO CLOUD</span></div><div class="audio-drop">${I('audio',34)}<strong>${state.audioName?esc(state.audioName):'Загрузите аудиофайл с iPad'}</strong><small>Файл не передаётся на сервер · MP3, WAV, AAC и другие поддерживаемые форматы</small><button class="primary-btn" data-action="pick-audio">${I('folder',16)} Выбрать аудио</button><input type="file" hidden id="audio-input" accept="audio/*"/></div><canvas id="audio-canvas" class="audio-canvas" width="1000" height="220" aria-label="Спектроанализатор"></canvas>${state.audioUrl?`<audio id="audio-player" class="audio-player" controls playsinline src="${state.audioUrl}"></audio>`:''}<div class="footer-note">${I('info',14)} Анализ работает во время воспроизведения. Поддерживаемые форматы зависят от Safari.</div>`;}
function calcView(){const buttons=['C','(',')','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','='];return `<div class="view-intro"><div><h2>Калькулятор</h2><p>Вычисления непосредственно в браузере.</p></div></div><div class="calc"><div class="calc-display" id="calc-display" aria-live="polite">${esc(state.calc)}</div><div class="calc-grid">${buttons.map(x=>`<button class="${'+−×÷()'.includes(x)?'operator':''} ${x==='='?'equal':''}" data-action="calc" data-value="${esc(x)}">${esc(x)}</button>`).join('')}</div></div>`;}
function clockView(){return `<div class="view-intro"><div><h2>Хронометр</h2><p>Локальное время вашего устройства.</p></div></div><div class="panel" style="padding:45px 20px;text-align:center;min-height:280px;display:flex;justify-content:center;align-items:center;flex-direction:column"><div class="overline">SYSTEM CHRONOMETER</div><div class="live-clock" style="font-size:clamp(62px,11vw,110px);font-weight:200;letter-spacing:-.06em;font-variant-numeric:tabular-nums;margin:14px 0;color:var(--accent)">${dateTime()}</div><div class="live-date" style="color:var(--muted);font-size:15px">${dateText()}</div></div>`;}
function diagnosticsView(){const checks=[['Сеть',navigator.onLine?'Доступна':'Нет соединения'],['Режим запуска',window.matchMedia('(display-mode: standalone)').matches||navigator.standalone?'Веб-приложение':'Вкладка браузера'],['Локальная база',state.storageOkay?'Доступна':'Не работает'],['Service Worker','serviceWorker' in navigator?'Поддерживается':'Недоступен'],['Web Audio',!!(window.AudioContext||window.webkitAudioContext)?'Поддерживается':'Недоступен'],['WebGL',(()=>{try{return !!document.createElement('canvas').getContext('webgl')}catch{return false}})()?'Поддерживается':'Недоступен'],['Голосовой ввод',!!(window.SpeechRecognition||window.webkitSpeechRecognition)?'Возможно':'Недоступен'],['Режим совместимости',state.voiceCompat?'Включён':'Отключён'],['Сенсорный экран',navigator.maxTouchPoints>0?'Обнаружен':'Не обнаружен']];return `<div class="view-intro"><div><h2>Диагностика</h2><p>Фактические возможности браузера. Это не доступ к настройкам iPadOS.</p></div></div><div class="status-grid">${checks.map(([label,val])=>`<div class="status-cell"><small>${esc(label)}</small><strong style="font-size:17px">${esc(val)}</strong></div>`).join('')}</div><section class="voice-diagnostic" aria-label="Диагностика голосового ввода"><div class="voice-diagnostic-head"><div><h3>Диагностика микрофона</h3><p>События браузера: начало записи, завершение захвата и отключение распознавания. JARVIS не может считывать системный индикатор iPadOS.</p></div><button class="secondary-btn" data-action="copy-voice-log">${I('download',15)} Скопировать журнал</button></div><textarea id="voice-log-text" class="voice-log-text" readonly spellcheck="false" aria-label="Журнал работы голосового ввода">${esc(voice.getDiagnosticText())}</textarea><div class="footer-note">Событие <strong>end</strong> означает завершение распознавания, но не гарантирует освобождения микрофона. Если <strong>audioend</strong> отсутствует и индикатор iPadOS продолжает гореть, веб-приложение не может проверить или принудительно закрыть внутреннюю аудиосессию WebKit. При зависании полностью закройте JARVIS через переключатель приложений.</div></section><div class="footer-note">${I('shield',14)} Журнал остаётся на iPad, не содержит текст ваших команд и никуда не отправляется.</div>`;}
function settingsView(){return `<div class="view-intro"><div><h2>Настройки JARVIS</h2><p>Персонализация, доступность и резервное копирование.</p></div></div><div class="settings-grid"><section class="setting-card"><h3>Визуальный интерфейс</h3><p>Цветовая схема командного центра. Никаких внешних ресурсов.</p><div class="theme-row">${['blue','amber','mint'].map((t,i)=>`<button class="theme-button ${t==='blue'?'':t} ${state.theme===t?'active':''}" data-action="theme" data-value="${t}" aria-label="Тема ${['Синий','Янтарь','Мята'][i]}">${I('target',25)}</button>`).join('')}</div><div class="toggle-row"><span class="small">Отключить анимации</span><button data-action="motion" class="toggle ${state.motion?'on':''}" aria-label="Переключить анимацию" aria-pressed="${state.motion}"></button></div></section><section class="setting-card"><h3>Голос и iPadOS</h3><p>Экспериментальная подготовка микрофона перед каждой командой для обхода проблемы WebKit в iPadOS 27. JARVIS коротко произнесёт «Слушаю». Если распознавание всё равно зависает, используйте диктовку клавиатуры.</p><div class="toggle-row"><span class="small">Совместимость Safari/iPadOS</span><button data-action="voice-compat" class="toggle ${state.voiceCompat?'on':''}" aria-label="Переключить совместимость голосового ввода" aria-pressed="${state.voiceCompat}"></button></div><div class="footer-note"><strong>Безопасный голосовой режим активен.</strong> По журналам вашего iPad, экспериментальная команда stop() приводила к зависанию следующего сеанса, поэтому она отключена. JARVIS ждёт естественного завершения Safari. Отсутствие audioend после end фиксируется как неподтверждённое освобождение микрофона.</div><button class="secondary-btn" data-action="open" data-app="diagnostics">${I('info',16)} Журнал микрофона</button></section><section class="setting-card"><h3>Резервная копия</h3><p>Сохранение заметок, задач, календаря, проектов, настроек и небольших файлов в JSON. Файлы больше 15 МБ пропускаются с предупреждением.</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:13px"><button class="secondary-btn" data-action="export-backup">${I('download',16)} Экспорт</button><button class="secondary-btn" data-action="import-backup">${I('upload',16)} Восстановить</button><input hidden type="file" accept=".json,application/json" id="backup-input"/></div></section><section class="setting-card"><h3>Приватность</h3><p>Заметки, задачи и файлы хранятся на этом устройстве в IndexedDB. При удалении данных Safari они могут исчезнуть. Нет синхронизации, учётных записей и серверной аналитики.</p><div class="overline">LOCAL FIRST / NO TELEMETRY</div><button class="secondary-btn" data-action="storage-persist">${I('shield',15)} Запросить постоянное хранилище</button></section><section class="setting-card"><h3>О системе</h3><p>JARVIS OS iPad Edition v${VERSION}. Локальная система для GitHub Pages: 12 модулей, два окна, автономная работа, резервное копирование.</p><button class="secondary-btn" data-action="open" data-app="diagnostics">${I('info',16)} Диагностика</button></section></div>`;}
function appContent(id){switch(id){case 'calendar':return calendarView(state,helpers);case 'projects':return projectsView(state,helpers);case 'focus':return focusView(state,helpers);case 'search':return searchView(state,helpers);case 'apps':return allApps();case 'notes':return notesView();case 'tasks':return tasksView();case 'vault':return vaultView();case 'audio':return audioView();case 'calculator':return calcView();case 'clock':return clockView();case 'diagnostics':return diagnosticsView();case 'settings':return settingsView();default:return allApps();}}
function paneHTML(id,where){
 const m=byId(id)||{name:'Приложения',description:'Каталог модулей',glyph:'apps'};
 const split=!!state.secondary;
 const hasAudio=id==='audio';
 return `<section class="stage-window ${split?'pane-split':''} ${state.focusedPane===where?'pane-focused':''}" data-pane="${where}" aria-label="${esc(m.name)}">
 <div class="window-top" data-focus-pane="${where}"><div class="window-title"><div class="module-icon">${I(m.glyph,19)}</div><div><strong>${esc(m.name)}</strong><span>${esc(m.description)} · ${split?(where==='primary'?'ПАНЕЛЬ 1':'ПАНЕЛЬ 2'):'JARVIS OS'}</span></div></div>
 <div class="window-actions">
 ${!split?`<button class="window-split-btn" data-action="split-pick" title="Два приложения рядом">${I('apps',16)}<span>Два окна</span></button>`:''}
 ${split?`<button class="icon-button" data-action="pick-side" data-pane="${where}" title="Заменить приложение">${I('apps',17)}</button>`:''}
 <button class="icon-button" data-action="command" title="Команды">${I('search',18)}</button>
 <button class="icon-button" data-action="close-pane" data-pane="${where}" aria-label="Закрыть окно">${I('close',20)}</button></div></div>
 ${!split&&state.tabs.length>1?`<div class="window-tabs" role="tablist">${state.tabs.map(tab=>`<button class="window-tab ${id===tab?'active':''}" data-action="switch-tab" data-app="${tab}">${esc(byId(tab)?.name||'Приложения')}${tab!==id?`<span class="window-tab-close" data-action="close-tab" data-app="${tab}">×</span>`:''}</button>`).join('')}</div>`:''}
 <div class="window-body">${appContent(id)}</div></section>`;
}
function splitPickerHTML(){if(!state.splitPicker)return '';
 const excluded=state.focusedPane==='secondary'?state.active:state.focusedPane==='primary'&&state.secondary?state.secondary:state.active;
 return `<div class="split-picker-overlay"><div class="split-picker-card"><div class="split-picker-head"><div><span class="overline">MULTITASKING</span><h3>Выберите второе приложение</h3></div><button class="icon-button" data-action="cancel-split" aria-label="Закрыть">${I('close',19)}</button></div><p>Разместите два модуля рядом. На узком экране они располагаются один над другим.</p><div class="split-picker-grid">${modules.filter(m=>m.id!==excluded).map(m=>`<button data-action="open-side" data-app="${m.id}" class="split-app-item">${I(m.glyph,20)}<span>${esc(m.name)}</span></button>`).join('')}</div></div></div>`;
}
function stageHTML(){if(!state.active)return '';
 const split=!!state.secondary;
 return `<div class="stage ${split?'split-stage':''}" role="region" aria-label="Рабочие окна" style="--pane-left:${state.splitRatio}%">
 ${paneHTML(state.active,'primary')}
 ${split?`<div class="split-divider" id="split-divider" role="separator" aria-label="Изменить размер панелей" aria-orientation="vertical" tabindex="0"><span></span></div>${paneHTML(state.secondary,'secondary')}`:''}
 ${splitPickerHTML()}</div>`;
}
function commandResults(query){const q=query.toLocaleLowerCase('ru-RU').trim();const candidates=[...modules,{id:'apps',name:'Все приложения',description:'Открыть каталог',glyph:'apps'}];const filtered=candidates.filter(x=>!q || `${x.name} ${x.description} ${x.id}`.toLocaleLowerCase('ru-RU').includes(q)|| (q.startsWith('открой ') && x.name.toLocaleLowerCase('ru-RU').includes(q.slice(7))));return `${filtered.map(m=>`<button class="command-result" data-action="open" data-app="${m.id}">${I(m.glyph,21)}<span><strong>${esc(m.name)}</strong><small>${esc(m.description)}</small></span>${I('chevron',16)}</button>`).join('')}${filtered.length?'':`<div class="empty-state" style="min-height:110px"><strong>Команда не найдена</strong><span class="small">Попробуйте: «заметки», «задачи», «аудио», «файлы»</span></div>`}`;}
function commandHTML(){return state.command?`<div class="command-overlay" id="command-overlay"><div class="command-box"><div class="command-input">${I('terminal',24)}<input id="command-field" type="search" autocomplete="off" placeholder="Какой модуль открыть, сэр?" value="${esc(state.query)}" aria-label="Команда"/><button class="icon-button ${voice.isActive()?'voice-active':''}" data-action="mic" title="${voice.isActive()?'Отменить голосовой ввод':'Начать голосовую команду'}" aria-pressed="${voice.isActive()}">${I('mic',20)}</button><button class="primary-btn command-execute" data-action="run-command">Выполнить</button><button class="icon-button" data-action="close-command" title="Закрыть">${I('close',20)}</button></div><div class="command-results">${commandResults(state.query)}</div><div class="voice-status" id="voice-status" role="status" aria-live="polite">${esc(voice.getStatus().message)}</div><div class="command-footer">Команды: «открой файлы» · «создай заметку» · «задача купить хлеб» · «две панели» · «тема янтарь». Работа без облачного ИИ.</div></div></div>`:'';}
function modalHTML(){return state.modal?`<div class="modal-layer"><div class="modal"><h3>${esc(state.modal.title)}</h3><p>${esc(state.modal.text)}</p><div class="modal-actions"><button class="secondary-btn" data-action="cancel-modal">Отмена</button><button class="${state.modal.danger?'danger-btn':'primary-btn'}" data-action="confirm-modal">Продолжить</button></div></div></div>`:'';}
let disposeHologram=null;
function render(){
 if(state.audioFrame){cancelAnimationFrame(state.audioFrame);state.audioFrame=0;}
 if(disposeHologram){disposeHologram();disposeHologram=null;}
 document.getElementById('app').innerHTML=`<div class="shell">${topbar()}<div class="workspace">${sidebar()}<main class="main-scroll">${home()}</main></div>${dock()}${stageHTML()}${commandHTML()}${modalHTML()}<div class="toast-stack" aria-live="polite"></div></div>`;
 disposeHologram=initHologram($('#holo-canvas'),{reduced:state.motion||!!state.active});
 if(state.command)$('#command-field')?.focus();
 if(state.active==='audio'||state.secondary==='audio')state.audioFrame=requestAnimationFrame(drawAudio);
 setupDivider();
}
function setupDivider(){const d=$('#split-divider');if(!d)return;
 let started=false;
 d.addEventListener('pointerdown',e=>{if(matchMedia('(max-width: 850px)').matches)return;started=true;d.setPointerCapture(e.pointerId);e.preventDefault();});
 d.addEventListener('pointermove',e=>{if(!started)return;const s=$('.stage');if(!s)return;const box=s.getBoundingClientRect();const x=e.clientX-box.left;state.splitRatio=Math.max(28,Math.min(72,Math.round(x/box.width*100)));s.style.setProperty('--pane-left',state.splitRatio+'%');});
 const finish=()=>{if(started){started=false;try{localStorage.setItem('jarvis-split-ratio',String(state.splitRatio));}catch{}}};
 d.addEventListener('pointerup',finish);d.addEventListener('pointercancel',finish);
 d.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();state.splitRatio=Math.max(28,Math.min(72,state.splitRatio+(e.key==='ArrowLeft'?-4:4)));$('.stage')?.style.setProperty('--pane-left',state.splitRatio+'%');try{localStorage.setItem('jarvis-split-ratio',String(state.splitRatio));}catch{}}});
}

async function refresh(){try{await flushNote();[state.notes,state.tasks,state.vault,state.events,state.projects,state.cards]=await Promise.all(['notes','tasks','vault','events','projects','cards'].map(s=>store.list(s)));state.notes.sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));state.tasks.sort((a,b)=>String(b.created).localeCompare(String(a.created)));state.vault.sort((a,b)=>String(b.created).localeCompare(String(a.created)));state.events.sort((a,b)=>String(a.start).localeCompare(String(b.start)));state.projects.sort((a,b)=>String(b.created).localeCompare(String(a.created)));if(!state.projects.some(p=>p.id===state.selectedProject))state.selectedProject=state.projects[0]?.id||null;state.storageOkay=true;}catch(e){state.storageOkay=false;console.error('Storage:',e);toast('Локальная база недоступна. Проверьте режим Safari.');}render();}
function shutdownAudio(){if(state.audioFrame)cancelAnimationFrame(state.audioFrame);state.audioFrame=0;try{$('#audio-player')?.pause()}catch{}if(state.audioSource)try{state.audioSource.disconnect()}catch{}state.audioSource=null;state.analyser=null;}
function openApp(id){
 if(voice.isActive())voice.cancel();
 if(id==='home'){returnHome();return;}
 if(!byId(id)&&id!=='apps')return;
 if(state.secondary){
   const replacing=state.focusedPane==='secondary'?'secondary':'active';
   if(state[replacing]==='audio'&&id!=='audio')shutdownAudio();
   if(state[replacing]===id)return;
   if(state[replacing==='active'?'secondary':'active']===id){state.focusedPane=replacing==='active'?'secondary':'primary';render();return;}
   state[replacing]=id;
 }else{
   if(state.active==='audio'&&id!=='audio')shutdownAudio();state.active=id;
 }
 state.command=false;state.query='';
 if(!state.tabs.includes(id))state.tabs.push(id);if(state.tabs.length>6)state.tabs.shift();render();
}
function returnHome(){if(voice.isActive())voice.cancel();if(state.active==='audio'||state.secondary==='audio')shutdownAudio();state.active=null;state.secondary=null;state.focusedPane='primary';state.splitPicker=false;state.command=false;state.query='';render();}
function closeTab(id){state.tabs=state.tabs.filter(t=>t!==id);if(state.active===id){if(id==='audio')shutdownAudio();state.active=state.tabs.at(-1)||null;}render();}
function openCommand(){state.command=true;state.query='';render();}
async function newNote(){const id=makeId();const note={id,title:'Новая заметка',body:'',updated:nowISO()};try{await store.put('notes',note);state.selectedNote=id;await refresh();$('#note-title')?.focus();$('#note-title')?.select();}catch(e){toast('Не удалось сохранить заметку');}}
let noteSaveTimer;
function queueSaveNote(){const n=state.notes.find(x=>x.id===state.selectedNote);if(!n)return;n.title=$('#note-title')?.value??n.title;n.body=$('#note-body')?.value??n.body;n.updated=nowISO();const el=$('#note-save-status');if(el)el.textContent='Сохранение...';clearTimeout(noteSaveTimer);noteSaveTimer=setTimeout(async()=>{try{await store.put('notes',n);const x=$('#note-save-status');if(x)x.textContent='Сохранено';}catch{toast('Ошибка сохранения заметки');}},350);}
async function flushNote(){if(noteSaveTimer){clearTimeout(noteSaveTimer);noteSaveTimer=null;const n=state.notes.find(x=>x.id===state.selectedNote);if(n)await store.put('notes',n).catch(()=>{});}}
async function addTask(){const input=$('#task-field');const text=input?.value.trim();if(!text)return toast('Введите текст задачи');const item={id:makeId(),text:text.slice(0,400),done:false,created:nowISO()};try{await store.put('tasks',item);await refresh();$('#task-field')?.focus();}catch{toast('Не удалось сохранить задачу');}}
async function toggleTask(id){const t=state.tasks.find(x=>x.id===id);if(!t)return;t.done=!t.done;await store.put('tasks',t);await refresh();}
async function addFiles(list){const files=Array.from(list||[]);if(!files.length)return;let count=0;for(const f of files){try{await store.put('vault',{id:makeId(),name:f.name,type:f.type,size:f.size,created:nowISO(),blob:f});count++}catch(e){toast(`Не удалось импортировать ${f.name}: недостаточно места?`);}}await refresh();if(count)toast(`Добавлено файлов: ${count}`);}
async function downloadFile(id){const f=await store.get('vault',id);if(!f)return;downloadBlob(f.blob,f.name);}
function downloadBlob(blob,name){const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function backup(){
 try{
  await flushNote();toast('Готовлю резервную копию…');
  const data=await exportBackup({theme:state.theme,motion:state.motion,voiceCompat:state.voiceCompat});
  downloadBlob(new Blob([JSON.stringify(data)],{type:'application/json'}),`jarvis-backup-${new Date().toISOString().slice(0,10)}.json`);
  toast(data.skipped?`Копия создана, файлов более 15 МБ пропущено: ${data.skipped}`:'Резервная копия создана. Сохраните её в «Файлы».');
 }catch(e){console.error(e);toast('Ошибка резервного копирования: '+(e?.message||''));}
}
async function restoreBackup(file){
 if(!file)return;
 let prepared;
 try{prepared=await prepareBackup(JSON.parse(await file.text()));}
 catch(e){toast('Ошибка проверки копии: '+(e?.message||'неподдерживаемый формат'));return;}
 const c=prepared.counts;
 state.modal={title:'Восстановить резервную копию?',text:`Проверено: заметок ${c.notes}, задач ${c.tasks}, файлов ${c.vault}, событий ${c.events}, проектов ${c.projects}, карточек ${c.cards}. Текущие данные будут заменены атомарно.`,danger:true,callback:async()=>{
   try{
     const cfg=await commitBackup(prepared);
     if(['blue','amber','mint'].includes(cfg.theme))state.theme=cfg.theme;
     if(typeof cfg.motion==='boolean')state.motion=cfg.motion;
     if(typeof cfg.voiceCompat==='boolean')state.voiceCompat=cfg.voiceCompat;
     state.selectedNote=null;state.selectedProject=null;saveSettings();await refresh();toast('Данные успешно восстановлены.');
   }catch(e){console.error(e);toast('Восстановление не удалось. Данные сохранены: '+(e.message||''));}
 }};
 render();
}
function shiftCalendar(direction){
 const [year,month]=state.calendarMonth.split('-').map(Number);
 const d=new Date(year,month-1+direction,1);
 const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
 state.calendarMonth=key;state.calendarDay=key+'-01';render();
}
async function submitEvent(form){
 const d=new FormData(form),title=String(d.get('event-title')||'').trim();
 const start=new Date(String(d.get('event-start')||''));
 const endValue=d.get('event-end'),end=endValue?new Date(String(endValue)):null;
 if(!title||Number.isNaN(start.getTime())||(end&&Number.isNaN(end.getTime())))return toast('Проверьте название и дату события');
 if(end&&end.getTime()<start.getTime())return toast('Окончание не может быть раньше начала');
 const current=state.events.find(x=>x.id===d.get('event-id'));
 const event={id:current?.id||makeId(),title:title.slice(0,160),start:start.toISOString(),end:end?.toISOString()||'',notes:String(d.get('event-notes')||'').slice(0,2000),created:current?.created||nowISO()};
 await store.put('events',event);state.editingEvent=null;await refresh();toast(current?'Событие обновлено':'Событие добавлено');
}
async function submitProject(form){
 const d=new FormData(form),title=String(d.get('project-title')||'').trim();if(!title)return;
 const project={id:makeId(),title:title.slice(0,120),description:'',created:nowISO()};
 await store.put('projects',project);state.selectedProject=project.id;await refresh();toast('Проект создан');
}
async function submitCard(form){
 const d=new FormData(form),title=String(d.get('card-title')||'').trim();
 if(!title||!state.selectedProject)return toast('Выберите проект и введите название');
 await store.put('cards',{id:makeId(),projectId:state.selectedProject,title:title.slice(0,400),column:'todo',created:nowISO()});
 await refresh();toast('Карточка добавлена');
}
function tickFocus(){
 const f=state.focus;
 if(f.running){
   const remains=Math.max(0,f.endsAt-Date.now());
   if(remains<=0){f.running=false;f.remainingMs=f.duration*60000;f.endsAt=0;f.completed++;saveFocus();toast('Сеанс концентрации завершён, сэр');if(state.active==='focus'||state.secondary==='focus')render();}
 }
 const label=$('#focus-clock');if(label){const millis=f.running?Math.max(0,f.endsAt-Date.now()):f.remainingMs;label.textContent=clockValue(millis);}
}
function changeCalc(v){if(v==='C'){state.calc='0';return render()}if(v==='='){try{state.calc=String(safeArithmetic(state.calc))}catch{state.calc='Ошибка'}return render()}if(v==='±'){state.calc=state.calc.startsWith('−')?state.calc.slice(1):'−'+state.calc;return render()}state.calc=state.calc==='0' && /^[0-9]$/.test(v)?v:(state.calc==='Ошибка'?v:state.calc+v);if(state.calc.length>48)state.calc=state.calc.slice(-48);const d=$('#calc-display');if(d)d.textContent=state.calc;}
function safeArithmetic(raw){const text=raw.replaceAll('×','*').replaceAll('÷','/').replaceAll('−','-').replace(/\s/g,'');if(!/^[\d.+*/()\-]+$/.test(text))throw Error();const tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)|[()+*/-]/g);if(!tokens||tokens.join('')!==text)throw Error();let pos=0;function atom(){if(tokens[pos]==='-'){pos++;return -atom()}if(tokens[pos]==='+'){pos++;return atom()}if(tokens[pos]==='('){pos++;const n=expr();if(tokens[pos++]!==')')throw Error();return n}const val=tokens[pos++];if(!val || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(val))throw Error();return Number(val)}function term(){let x=atom();while(tokens[pos]==='*'||tokens[pos]==='/'){const op=tokens[pos++];const n=atom();x=op==='*'?x*n:x/n;}return x}function expr(){let x=term();while(tokens[pos]==='+'||tokens[pos]==='-'){const op=tokens[pos++];const n=term();x=op==='+'?x+n:x-n;}return x}const answer=expr();if(pos!==tokens.length||!Number.isFinite(answer))throw Error();return Number(answer.toPrecision(12))}
function drawAudio(){if(state.active!=='audio'&&state.secondary!=='audio')return;const canvas=$('#audio-canvas');if(!canvas)return;const ctx=canvas.getContext('2d');if(!ctx)return;const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#050e1c';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(120,205,238,.09)';for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=0;y<H;y+=44){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}const frequency=new Uint8Array(state.analyser?.frequencyBinCount||128);if(state.analyser)state.analyser.getByteFrequencyData(frequency);const count=96, barW=W/count;for(let i=0;i<count;i++){const v=state.analyser ? frequency[Math.floor(i*frequency.length/count)]/255 : .045+Math.sin(i*.25)**2*.06;const h=Math.max(3,v*(H-32));ctx.fillStyle=`hsla(${state.theme==='amber'?37:state.theme==='mint'?155:192},95%,${54+v*23}%,${.4+v*.6})`;ctx.fillRect(i*barW+2,H/2-h/2,barW-4,h);}ctx.fillStyle='rgba(200,232,244,.45)';ctx.font='12px system-ui';ctx.fillText('FREQUENCY SPECTRUM / LOCAL AUDIO',17,20);state.audioFrame=requestAnimationFrame(drawAudio)}
async function loadAudio(file){if(!file)return;if(!file.type.startsWith('audio/'))return toast('Выберите аудиофайл');shutdownAudio();if(state.audioUrl)URL.revokeObjectURL(state.audioUrl);state.audioUrl=URL.createObjectURL(file);state.audioName=file.name;render();const player=$('#audio-player');if(player){player.addEventListener('play',async()=>{try{if(!state.audioCtx)state.audioCtx=new (window.AudioContext||window.webkitAudioContext)();await state.audioCtx.resume();if(!state.audioSource){state.audioSource=state.audioCtx.createMediaElementSource(player);state.analyser=state.audioCtx.createAnalyser();state.analyser.fftSize=512;state.audioSource.connect(state.analyser);state.analyser.connect(state.audioCtx.destination);}}catch(e){toast('Спектроанализ недоступен: '+e.message)}},{once:true});}}
function listen(){if(voice.isActive()){voice.cancel();return;}const input=$('#command-field');input?.blur();voice.start({compatibility:state.voiceCompat});}
async function executeCommand(raw){
 const intent=interpretCommand(raw,modules);
 if(intent.type==='open'){await flushNote();openApp(intent.id);toast('Открываю: '+(byId(intent.id)?.name||'Приложения'));return;}
 if(intent.type==='new-note'){state.command=false;openApp('notes');await newNote();toast('Новая заметка готова, сэр');return;}
 if(intent.type==='task'){
   const text=intent.text.trim();if(!text){state.command=false;openApp('tasks');toast('Введите задачу в поле добавления');return;}
   const item={id:makeId(),text:text.slice(0,400),done:false,created:nowISO()};
   await store.put('tasks',item);state.command=false;await refresh();toast('Задача добавлена: '+item.text);return;
 }
 if(intent.type==='theme'){state.theme=intent.theme;state.command=false;saveSettings();render();toast('Цветовая схема изменена');return;}
 if(intent.type==='split'){state.command=false;if(!state.active)state.active='notes';state.focusedPane='primary';state.splitPicker=true;render();return;}
 if(intent.type==='search'){state.searchQuery=intent.query;state.command=false;openApp('search');return;}
 if(intent.type==='time'){state.command=false;render();toast('Сейчас '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}));return;}
 if(intent.type==='home'){returnHome();return;}
 if(intent.type==='help'){state.command=true;state.query='';render();toast('Скажите «открой заметки», «задача...», «две панели»');return;}
 if(intent.type==='empty'){toast('Введите команду');return;}
 toast('Команда не распознана. Попробуйте «открой заметки» или «новая заметка»');
}
async function handleAction(action,el,event){const id=el.dataset.id;const app=el.dataset.app;switch(action){case 'run-command':await executeCommand($('#command-field')?.value||state.query);break;case 'split-pick':state.focusedPane='primary';state.splitPicker=true;render();break;case 'pick-side':state.focusedPane=el.dataset.pane||'primary';state.splitPicker=true;render();break;case 'cancel-split':state.splitPicker=false;render();break;case 'open-side':{await flushNote();if(state.focusedPane==='secondary'){state.secondary=app;}else if(state.secondary){state.active=app;}else{state.secondary=app;state.focusedPane='secondary';}state.splitPicker=false;state.command=false;render();break;}case 'close-pane':{await flushNote();if(el.dataset.pane==='secondary'){if(state.secondary==='audio')shutdownAudio();state.secondary=null;state.focusedPane='primary';}else if(state.secondary){if(state.active==='audio')shutdownAudio();state.active=state.secondary;state.secondary=null;state.focusedPane='primary';}else{returnHome();break;}render();break;}case 'open':await flushNote();openApp(app);break;case 'show-apps':await flushNote();openApp('apps');break;case 'home':await flushNote();returnHome();break;case 'command':openCommand();break;case 'close-command':voice.cancel();state.command=false;render();break;case 'mic':listen();break;case 'voice-compat':state.voiceCompat=!state.voiceCompat;saveSettings();render();break;case 'copy-voice-log':{const log=voice.getDiagnosticText();try{await navigator.clipboard.writeText(log);toast('Журнал скопирован. В нём нет текста команд.');}catch{const area=$('#voice-log-text');area?.focus();area?.select();toast('Выделен журнал. Скопируйте его вручную.');}break;}case 'switch-tab':await flushNote();openApp(app);break;case 'close-tab':event.stopPropagation();await flushNote();closeTab(app);break;case 'new-note':await newNote();break;case 'select-note':await flushNote();state.selectedNote=id;render();break;case 'delete-note':state.modal={title:'Удалить заметку?',text:'Запись будет безвозвратно удалена из локальной базы.',danger:true,callback:async()=>{await store.remove('notes',id);state.selectedNote=null;await refresh();}};render();break;case 'add-task':await addTask();break;case 'toggle-task':await toggleTask(id);break;case 'delete-task':await store.remove('tasks',id);await refresh();break;case 'upload-file':$('#vault-input')?.click();break;case 'download-file':await downloadFile(id);break;case 'delete-file':state.modal={title:'Удалить файл?',text:'Файл будет удалён из хранилища JARVIS. Оригиналы в приложении «Файлы» не затрагиваются.',danger:true,callback:async()=>{await store.remove('vault',id);await refresh();}};render();break;case 'pick-audio':$('#audio-input')?.click();break;case 'theme':state.theme=el.dataset.value;saveSettings();render();break;case 'motion':state.motion=!state.motion;saveSettings();render();break;case 'export-backup':await backup();break;case 'import-backup':$('#backup-input')?.click();break;case 'calc':changeCalc(el.dataset.value);break;
 case 'calendar-prev':shiftCalendar(-1);break;
 case 'calendar-next':shiftCalendar(1);break;
 case 'calendar-today':state.calendarDay=todayKey();state.calendarMonth=state.calendarDay.slice(0,7);render();break;
 case 'calendar-day':state.calendarDay=el.dataset.value;state.editingEvent=null;render();break;
 case 'edit-event':state.editingEvent=id;render();break;
 case 'calendar-cancel-edit':state.editingEvent=null;render();break;
 case 'delete-event':state.modal={title:'Удалить событие?',text:'Событие будет удалено из локального календаря.',danger:true,callback:async()=>{await store.remove('events',id);state.editingEvent=null;await refresh();}};render();break;
 case 'select-project':state.selectedProject=id;render();break;
 case 'delete-project':state.modal={title:'Удалить проект и его карточки?',text:'Все карточки выбранного проекта будут удалены. Восстановить можно из резервной копии.',danger:true,callback:async()=>{for(const card of state.cards.filter(c=>c.projectId===id))await store.remove('cards',card.id);await store.remove('projects',id);await refresh();}};render();break;
 case 'move-card':{const c=state.cards.find(x=>x.id===id);if(c&&['todo','doing','done'].includes(el.dataset.value)){c.column=el.dataset.value;await store.put('cards',c);await refresh();}break;}
 case 'delete-card':await store.remove('cards',id);await refresh();break;
 case 'search-go':{if(app==='notes')state.selectedNote=id;if(app==='projects'){const card=state.cards.find(c=>c.id===id);state.selectedProject=card?.projectId||id;}if(app==='calendar'){const entry=state.events.find(e=>e.id===id);if(entry){const d=new Date(entry.start);const local=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;state.calendarDay=local;state.calendarMonth=local.slice(0,7);}}openApp(app);break;}
 case 'focus-preset':{const n=Number(el.dataset.value);if([15,25,45,60].includes(n)){state.focus={...state.focus,duration:n,remainingMs:n*60000,running:false,endsAt:0};saveFocus();render();}break;}
 case 'focus-toggle':{const f=state.focus;if(f.running){f.remainingMs=Math.max(0,f.endsAt-Date.now());f.running=false;f.endsAt=0;}else{f.remainingMs=f.remainingMs>0?f.remainingMs:f.duration*60000;f.endsAt=Date.now()+f.remainingMs;f.running=true;}saveFocus();render();break;}
 case 'focus-reset':state.focus={...state.focus,running:false,endsAt:0,remainingMs:state.focus.duration*60000};saveFocus();render();break;
 case 'storage-persist':{if(!navigator.storage?.persist){toast('Этот браузер не поддерживает постоянное хранилище');break;}const persisted=await navigator.storage.persist();toast(persisted?'Хранилище помечено как постоянное':'Safari управляет сохранностью данных автоматически. Используйте экспорт.');break;}
 case 'cancel-modal':state.modal=null;render();break;case 'confirm-modal':{const callback=state.modal?.callback;state.modal=null;render();if(callback)await callback();break;}default:break}}
document.addEventListener('pointerdown',e=>{const pane=e.target.closest('.stage-window[data-pane]');if(pane&&state.secondary)state.focusedPane=pane.dataset.pane;},true);
document.addEventListener('click',async e=>{const t=e.target.closest('[data-action]');if(t){try{await handleAction(t.dataset.action,t,e)}catch(err){console.error(err);toast('Ошибка операции. Проверьте свободное место и разрешения.')}}else if(e.target.id==='command-overlay'){voice.cancel();state.command=false;render();}else{const h=e.target.closest('[data-focus-pane]');if(h&&state.secondary)state.focusedPane=h.dataset.focusPane;}});
document.addEventListener('input',e=>{if(e.target.id==='note-title'||e.target.id==='note-body')queueSaveNote();if(e.target.id==='command-field'){state.query=e.target.value;const box=$('.command-results');if(box)box.innerHTML=commandResults(state.query);}if(e.target.id==='global-search-field'){state.searchQuery=e.target.value;const result=$('#global-search-results');if(result)result.innerHTML=searchResults(state,helpers);}});
document.addEventListener('submit',async e=>{if(['event-form','project-form','card-form'].includes(e.target.id)){e.preventDefault();try{if(e.target.id==='event-form')await submitEvent(e.target);if(e.target.id==='project-form')await submitProject(e.target);if(e.target.id==='card-form')await submitCard(e.target);}catch(error){console.error(error);toast('Не удалось сохранить данные');}}});
document.addEventListener('change',e=>{if(e.target.id==='vault-input')addFiles(e.target.files);if(e.target.id==='audio-input')loadAudio(e.target.files[0]);if(e.target.id==='backup-input')restoreBackup(e.target.files[0]);});
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommand()}if(e.key==='Escape'){if(state.modal){state.modal=null;render()}else if(state.command){voice.cancel();state.command=false;render()}else if(state.active){returnHome()}}if(e.key==='Enter'&&e.target.id==='task-field')addTask();if(e.key==='Enter'&&e.target.id==='command-field'){e.preventDefault();executeCommand(e.target.value).catch(()=>toast('Не удалось выполнить команду'));}});
window.addEventListener('online',()=>{toast('Соединение восстановлено');render()});window.addEventListener('offline',()=>{toast('Автономный режим: локальные модули доступны');render()});
window.addEventListener('pagehide',()=>{if(voice.isActive())voice.cancel('pagehide');flushNote();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&voice.isActive())voice.cancel('background');});
setInterval(tickFocus,1000);
setInterval(()=>{document.querySelectorAll('.live-clock').forEach(el=>el.textContent=dateTime());document.querySelectorAll('.live-date').forEach(el=>el.textContent=dateText());},1000);
async function start(){saveSettings();try{await refresh();}catch(e){state.storageOkay=false;console.error(e)}state.loaded=true;render();if('serviceWorker' in navigator && location.protocol.startsWith('http')){try{const swUrl=new URL('./sw.js',import.meta.url);const registration=await navigator.serviceWorker.register(swUrl.href,{scope:new URL('./',import.meta.url).pathname});registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)toast('Обновление загружено. Перезапустите JARVIS OS для обновления.')})});}catch(e){console.warn('Service worker unavailable:',e)}}}
start();
