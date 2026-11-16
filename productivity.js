/* Trusted first-party modules for JARVIS OS. All user-supplied data is escaped. */
const safeDate=value=>{const d=new Date(value);return Number.isNaN(d.valueOf())?null:d};
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const labelDate=(v,withTime=false)=>{const d=safeDate(v);return d?d.toLocaleString('ru-RU',withTime?{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}:{weekday:'long',day:'numeric',month:'long'}):'Дата не указана'};
export function localDateTime(value=new Date()){
  const d=new Date(value);if(!Number.isFinite(d.valueOf()))return '';
  return `${dateKey(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
export const todayKey=()=>dateKey(new Date());
export const nextEvent=events=>events.filter(x=>safeDate(x.start)&&new Date(x.start).getTime()>=Date.now()-30*60*1000).sort((a,b)=>a.start.localeCompare(b.start))[0];

export function calendarView(state,{I,esc}){
  const current=/^\d{4}-\d{2}$/.test(state.calendarMonth)?state.calendarMonth:todayKey().slice(0,7);
  const [year,month]=current.split('-').map(Number);
  const first=new Date(year,month-1,1),monthTitle=first.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
  const days=new Date(year,month,0).getDate(),offset=(first.getDay()+6)%7;
  const cells=[];
  const eventsPerDay=new Map();
  for(const e of state.events){const d=safeDate(e.start);if(!d)continue;const key=dateKey(d);eventsPerDay.set(key,(eventsPerDay.get(key)||0)+1);}
  for(let i=0;i<offset;i++)cells.push('<span class="cal-empty" aria-hidden="true"></span>');
  for(let day=1;day<=days;day++){
    const key=`${current}-${String(day).padStart(2,'0')}`,count=eventsPerDay.get(key)||0;
    cells.push(`<button class="cal-day ${key===state.calendarDay?'selected':''} ${key===todayKey()?'today':''}" data-action="calendar-day" data-value="${key}" aria-pressed="${key===state.calendarDay}" aria-label="${day} число, событий: ${count}"><b>${day}</b>${count?`<i>${count}</i>`:''}</button>`);
  }
  const selected=state.events.filter(e=>{const d=safeDate(e.start);return d&&dateKey(d)===state.calendarDay}).sort((a,b)=>a.start.localeCompare(b.start));
  const chosen=labelDate(state.calendarDay+'T12:00:00');
  const editing=state.events.find(e=>e.id===state.editingEvent);
  const startValue=editing?localDateTime(editing.start):localDateTime(new Date(state.calendarDay+'T10:00:00'));
  const endValue=editing&&editing.end?localDateTime(editing.end):localDateTime(new Date(state.calendarDay+'T11:00:00'));
  return `<div class="view-intro"><div><h2>Календарь</h2><p>События и планы. Только на этом устройстве.</p></div><button class="secondary-btn" data-action="calendar-today">${I('calendar',16)} Сегодня</button></div>
  <div class="cal-layout"><section class="cal-panel"><div class="cal-toolbar"><button class="icon-button" data-action="calendar-prev" aria-label="Предыдущий месяц">${I('back',18)}</button><strong>${esc(monthTitle)}</strong><button class="icon-button" data-action="calendar-next" aria-label="Следующий месяц">${I('chevron',18)}</button></div><div class="cal-grid">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d=>`<span class="cal-weekday">${d}</span>`).join('')}${cells.join('')}</div></section>
  <section class="cal-side"><div class="section-caption">${esc(chosen)}</div>${selected.length?selected.map(e=>`<article class="event-row"><div><span class="overline">${esc(labelDate(e.start,true))}</span><strong>${esc(e.title)}</strong>${e.notes?`<p>${esc(e.notes)}</p>`:''}</div><button class="icon-button" data-action="edit-event" data-id="${esc(e.id)}" aria-label="Изменить событие">${I('pen',16)}</button><button class="icon-button" data-action="delete-event" data-id="${esc(e.id)}" aria-label="Удалить событие">${I('trash',17)}</button></article>`).join(''):`<div class="empty-state compact">${I('calendar',23)}<strong>Событий нет</strong><span class="small">Добавьте первое событие</span></div>`}
  <form id="event-form" class="system-form">${editing?`<input type="hidden" name="event-id" value="${esc(editing.id)}"/>`:''}<label>Название события<input class="field" name="event-title" maxlength="160" required placeholder="Встреча или идея" value="${esc(editing?.title||'')}" /></label><div class="field-pair"><label>Начало<input class="field" type="datetime-local" name="event-start" required value="${esc(startValue)}" /></label><label>Окончание<input class="field" type="datetime-local" name="event-end" value="${esc(endValue)}" /></label></div><label>Описание (необязательно)<textarea class="field" name="event-notes" maxlength="2000" rows="2" placeholder="Важные детали">${esc(editing?.notes||'')}</textarea></label><div class="focus-buttons"><button type="submit" class="primary-btn">${I(editing?'check':'plus',16)} ${editing?'Сохранить':'Добавить событие'}</button>${editing?'<button type="button" class="secondary-btn" data-action="calendar-cancel-edit">Отмена</button>':''}</div></form></section></div>`;
}

const columns=[['todo','ПЛАН'],['doing','В РАБОТЕ'],['done','ГОТОВО']];
export function projectsView(state,{I,esc}){
  const project=state.projects.find(p=>p.id===state.selectedProject)||state.projects[0];
  const cards=state.cards.filter(c=>c.projectId===project?.id);
  return `<div class="view-intro"><div><h2>Проекты</h2><p>Сенсорная канбан-доска. Карточки перемещаются кнопками.</p></div><span class="version-pill">${state.projects.length} PROJECTS</span></div>
    <div class="project-layout"><aside class="project-sidebar"><div class="section-caption">ВАШИ ПРОЕКТЫ</div>${state.projects.map(p=>`<button class="project-choice ${p.id===project?.id?'active':''}" data-action="select-project" data-id="${esc(p.id)}">${I('layers',18)}<span>${esc(p.title)}</span></button>`).join('')}
    <form id="project-form" class="system-form"><label>Новый проект<input class="field" name="project-title" maxlength="120" required placeholder="Название" /></label><button type="submit" class="secondary-btn">${I('plus',16)} Создать</button></form></aside>
    <div class="project-main">${project?`<div class="project-head"><div><h3>${esc(project.title)}</h3><p>${esc(project.description||'Рабочая доска JARVIS')}</p></div><button class="danger-btn" data-action="delete-project" data-id="${esc(project.id)}">${I('trash',15)} Удалить проект</button></div>
    <form id="card-form" class="task-entry"><input class="field" name="card-title" maxlength="400" aria-label="Название карточки" placeholder="Добавить задачу в проект" required/><button class="primary-btn" type="submit">${I('plus',15)} Карточка</button></form>
    <div class="kanban">${columns.map(([key,label],index)=>`<section class="kanban-col"><header>${label}<small>${cards.filter(c=>c.column===key).length}</small></header><div class="kanban-cards">${cards.filter(c=>c.column===key).map(c=>`<article class="kanban-card"><p>${esc(c.title)}</p><div class="kanban-actions"><button data-action="move-card" data-id="${esc(c.id)}" data-value="${columns[index-1]?.[0]||''}" ${index===0?'disabled':''} aria-label="Назад">${I('back',16)}</button><button data-action="move-card" data-id="${esc(c.id)}" data-value="${columns[index+1]?.[0]||''}" ${index===2?'disabled':''} aria-label="Вперёд">${I('chevron',16)}</button><button data-action="delete-card" data-id="${esc(c.id)}" aria-label="Удалить карточку">${I('trash',15)}</button></div></article>`).join('')||'<p class="small muted">Пусто</p>'}</div></section>`).join('')}</div>`:`<div class="empty-state">${I('layers',28)}<strong>Создайте первый проект</strong><span class="small">После этого появится доска из трёх колонок.</span></div>`}</div></div>`;
}

export function focusView(state,{I,esc}){
  const f=state.focus;
  const total=f.duration*60*1000,remaining=f.running?Math.max(0,f.endsAt-Date.now()):f.remainingMs;
  const clamped=Math.min(total,Math.max(0,remaining));
  const value=clockValue(clamped),percent=Math.round((1-clamped/total)*100);
  return `<div class="view-intro"><div><h2>Фокус</h2><p>Таймер концентрации. Время рассчитывается по часам устройства.</p></div><span class="version-pill">${f.completed} CYCLES</span></div>
  <div class="focus-layout"><div class="focus-orbit" style="--progress:${percent}%"><div class="focus-orbit-center"><span class="overline">${f.running?'СЕАНС ИДЁТ':'ГОТОВ К РАБОТЕ'}</span><strong id="focus-clock">${value}</strong><small>Осталось минут и секунд</small></div></div><div class="focus-controls"><div class="focus-presets">${[15,25,45,60].map(n=>`<button class="${f.duration===n?'chosen':''}" data-action="focus-preset" data-value="${n}">${n} мин</button>`).join('')}</div><div class="focus-buttons"><button class="primary-btn" data-action="focus-toggle">${I(f.running?'pause':'play',17)} ${f.running?'Пауза':'Начать'}</button><button class="secondary-btn" data-action="focus-reset">${I('refresh',16)} Сброс</button></div><div class="footer-note">Таймер продолжит отсчёт после блокировки экрана, но Safari может приостановить отображение и не сможет гарантированно подать сигнал в фоне.</div></div></div>`;
}
export function clockValue(ms){const s=Math.ceil(Math.max(0,ms)/1000),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}

export function searchResults(state,{I,esc}){
  const query=state.searchQuery.trim().toLocaleLowerCase('ru-RU');
  if(!query)return `<div class="empty-state compact">${I('search',24)}<strong>Поиск по вашему пространству</strong><span class="small">Заметки, задачи, файлы, события и карточки проектов</span></div>`;
  const hits=[];
  const match=(...vals)=>vals.some(x=>String(x||'').toLocaleLowerCase('ru-RU').includes(query));
  for(const n of state.notes)if(match(n.title,n.body))hits.push({label:n.title||'Без названия',detail:(n.body||'').slice(0,120),app:'notes',id:n.id,glyph:'note'});
  for(const t of state.tasks)if(match(t.text))hits.push({label:t.text,detail:t.done?'Выполнена':'В работе',app:'tasks',id:t.id,glyph:'tasks'});
  for(const f of state.vault)if(match(f.name))hits.push({label:f.name,detail:'Файл',app:'vault',id:f.id,glyph:'folder'});
  for(const e of state.events)if(match(e.title,e.notes))hits.push({label:e.title,detail:labelDate(e.start,true),app:'calendar',id:e.id,glyph:'calendar'});
  for(const p of state.projects)if(match(p.title,p.description))hits.push({label:p.title,detail:'Проект',app:'projects',id:p.id,glyph:'layers'});
  for(const c of state.cards)if(match(c.title))hits.push({label:c.title,detail:'Карточка проекта',app:'projects',id:c.id,glyph:'layers'});
  return hits.length?`<div class="search-count">Результатов: ${hits.length}</div><div class="search-hits">${hits.slice(0,80).map(h=>`<button class="search-hit" data-action="search-go" data-app="${h.app}" data-id="${esc(h.id)}">${I(h.glyph,19)}<span><strong>${esc(h.label)}</strong><small>${esc(h.detail)}</small></span>${I('chevron',16)}</button>`).join('')}</div>${hits.length>80?'<p class="muted small">Показаны первые 80 совпадений. Уточните запрос.</p>':''}`:`<div class="empty-state compact">${I('search',24)}<strong>Совпадений нет</strong><span class="small">Попробуйте другое слово</span></div>`;
}
export function searchView(state,helpers){return `<div class="view-intro"><div><h2>Глобальный поиск</h2><p>Локальный поиск без отправки данных в интернет.</p></div></div><div class="search-field">${helpers.I('search',22)}<input id="global-search-field" class="field" type="search" autocomplete="off" placeholder="Что ищем, сэр?" value="${helpers.esc(state.searchQuery)}" aria-label="Поиск в JARVIS"/></div><div id="global-search-results">${searchResults(state,helpers)}</div>`;}
