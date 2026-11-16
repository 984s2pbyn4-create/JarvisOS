/* Interactive visual index of local JARVIS records. No network. */
import {escapeHTML as esc} from './db.js';
const types={projects:{label:'Проекты',color:'#75eeff',app:'projects'},cards:{label:'Карточки',color:'#77a1ff',app:'projects'},notes:{label:'Заметки',color:'#deb0ff',app:'notes'},tasks:{label:'Задачи',color:'#ffbd79',app:'tasks'},events:{label:'Календарь',color:'#85f1be',app:'calendar'},vault:{label:'Файлы',color:'#f7dd8e',app:'vault'}};
const short=x=>String(x||'').slice(0,90);
const id=x=>String(x||'').slice(0,120);
export function atlasItems(s,filter='all'){
 const entries=[];
 const add=(type,values,label,description,parent)=>{
  for(const item of (values||[]).slice(0,25)){
   if(filter!=='all'&&type!==filter&&!(filter==='projects'&&type==='cards'))continue;
   entries.push({type,id:id(item.id),label:short(label(item)),description:short(description(item)),parent:parent?parent(item):'',app:types[type].app,color:types[type].color});
  }
 };
 add('projects',s.projects,p=>p.title||'Без названия',p=>p.description||'Проект');
 add('cards',s.cards,x=>x.title||'Карточка',x=>`Статус: ${{todo:'План',doing:'В работе',done:'Готово'}[x.column]||'План'}`,x=>id(x.projectId));
 add('notes',s.notes,n=>n.title||'Заметка',n=>(n.body||'').slice(0,100));
 add('tasks',s.tasks,t=>t.text||'Задача',t=>t.done?'Выполнена':'Не выполнена');
 add('events',s.events,e=>e.title||'Событие',e=>e.start||'Без даты');
 add('vault',s.vault,f=>f.name||'Файл',f=>`${Math.round((Number(f.size)||0)/1024)} КБ`);
 return entries.slice(0,100);
}
export function atlasView(s,filter='all'){
 const entries=atlasItems(s,filter);
 return `<div class="c2-app c2-atlas"><div class="c2-app-head"><div><div class="c2-mini-label">SPATIAL INFORMATION MATRIX</div><h2>DATA <span class="c2-cyan">ATLAS</span></h2><p>Живая карта локальных проектов, заметок, задач и файлов. Коснитесь узла, чтобы изучить его.</p></div><strong class="c2-atlas-count">${entries.length} УЗЛОВ</strong></div>
 <div class="c2-atlas-filters">${[['all','ВСЕ'],['projects','ПРОЕКТЫ'],['notes','ЗАМЕТКИ'],['tasks','ЗАДАЧИ'],['events','СОБЫТИЯ'],['vault','ФАЙЛЫ']].map(([v,n])=>`<button data-action="atlas-filter" data-value="${v}" ${filter===v?'aria-pressed="true"':''}>${n}</button>`).join('')}</div>
 <div class="c2-atlas-grid"><div class="c2-map-shell"><canvas id="c2-atlas-canvas" role="img" aria-label="Пространственная карта ваших локальных данных"></canvas><div class="c2-atlas-headtop">LOCAL DATA / NETWORK<span class="c2-atlas-blip">●</span></div><div class="c2-atlas-foot">ВРАЩЕНИЕ: ПАЛЕЦ · ВЫБОР: КАСАНИЕ · ${entries.length} ЭЛЕМЕНТОВ</div></div>
 <div class="c2-atlas-detail" id="c2-atlas-detail"><span class="c2-mini-label">ВЫБРАННЫЙ ОБЪЕКТ</span><div class="c2-atlas-target">◎</div><h3>ВЫБЕРИТЕ УЗЕЛ</h3><p>${entries.length?'Нажмите на точку в голографической сети, чтобы увидеть запись и перейти к ней.':'Локальных записей нет. Создайте заметку, задачу или проект.'}</p></div></div>
 <div class="c2-atlas-legend">${Object.entries(types).map(([k,v])=>`<span><i style="background:${v.color}"></i>${v.label}</span>`).join('')}</div><div class="c2-footnote">Визуализация создана локально из данных JARVIS. Это карта связей, а не интеллектуальный анализ содержания документов.</div></div>`;
}
export function initAtlas(canvas,s,filter='all',reduced=false){
 if(!canvas)return ()=>{};const ctx=canvas.getContext('2d');if(!ctx)return ()=>{};
 let disposed=false,raf=0,w=0,h=0,turn=.0,last=0,drag=null;const nodes=atlasItems(s,filter);const coords=[];
 const rings={projects:.39,cards:.54,notes:.72,tasks:.9,events:.83,vault:.63};
 const byType={};for(const [i,n] of nodes.entries()){const count=byType[n.type]||0;byType[n.type]=count+1;}
 const index={};nodes.forEach((n,i)=>{const j=index[n.type]||0;index[n.type]=j+1;const angle=j/Math.max(1,byType[n.type])*Math.PI*2+({projects:0,cards:1,notes:2.1,tasks:.5,events:1.7,vault:3}[n.type]);coords.push({theta:angle,ratio:rings[n.type],node:n});});
 function resize(){const rect=canvas.getBoundingClientRect();w=rect.width||400;h=rect.height||400;const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
 const ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;ro?.observe(canvas);resize();
 function point(c){const r=Math.min(w,h)*.44;const a=c.theta+turn;return {x:w/2+Math.cos(a)*r*c.ratio,y:h/2+Math.sin(a)*r*c.ratio*.8};}
 function draw(t){if(disposed||document.hidden)return;ctx.clearRect(0,0,w,h);const ox=w/2,oy=h/2,r=Math.min(w,h)*.44;
  const halo=ctx.createRadialGradient(ox,oy,0,ox,oy,r);halo.addColorStop(0,'rgba(15,119,184,.25)');halo.addColorStop(1,'rgba(5,47,87,0)');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(ox,oy,r,0,Math.PI*2);ctx.fill();
  for(let k=1;k<=4;k++){ctx.beginPath();ctx.ellipse(ox,oy,r*k/4,r*k/4*.8,0,0,Math.PI*2);ctx.strokeStyle='rgba(91,182,223,.11)';ctx.stroke();}
  for(let k=0;k<12;k++){const a=k*Math.PI/6;ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+Math.cos(a)*r,oy+Math.sin(a)*r*.8);ctx.strokeStyle='rgba(91,182,223,.06)';ctx.stroke();}
  const locations=coords.map(point);const projects=new Map();coords.forEach((c,i)=>{if(c.node.type==='projects')projects.set(c.node.id,locations[i]);});
  coords.forEach((c,i)=>{const p=locations[i],parent=c.node.parent&&projects.get(c.node.parent)||{x:ox,y:oy};ctx.beginPath();ctx.moveTo(parent.x,parent.y);ctx.lineTo(p.x,p.y);ctx.strokeStyle=c.node.type==='cards'?'rgba(110,149,251,.18)':'rgba(82,181,223,.12)';ctx.stroke();});
  coords.forEach((c,i)=>{const p=locations[i];const glow=ctx.createRadialGradient(p.x,p.y,.5,p.x,p.y,12);glow.addColorStop(0,c.node.color+'88');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();ctx.fillStyle=c.node.color;ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,Math.PI*2);ctx.fill();});
  ctx.strokeStyle='rgba(120,236,255,.8)';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(ox,oy,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#b8f4ff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='16px system-ui';ctx.fillText('J',ox,oy);
 }
 function frame(t){if(disposed)return;raf=requestAnimationFrame(frame);if(t-last<34)return;last=t;if(!drag&&!reduced)turn+=.00055;draw(t);}
 function down(e){drag={x:e.clientX,y:e.clientY,downX:e.clientX,downY:e.clientY,hasMoved:false};canvas.setPointerCapture(e.pointerId);}
 function move(e){if(!drag)return;const dx=e.clientX-drag.x;if(Math.abs(e.clientX-drag.downX)>9||Math.abs(e.clientY-drag.downY)>9)drag.hasMoved=true;if(drag.hasMoved){turn+=dx*.007;drag.x=e.clientX;drag.y=e.clientY;}}
 function up(e){if(!drag)return;const moved=drag.hasMoved;drag=null;if(moved)return;const rect=canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;let hit=null,min=24;coords.forEach((c,i)=>{const p=point(c);const d=Math.hypot(p.x-x,p.y-y);if(d<min){min=d;hit=c.node;}});if(!hit)return;const target=document.getElementById('c2-atlas-detail');if(target)target.innerHTML=`<span class="c2-mini-label">${esc(types[hit.type].label.toUpperCase())}</span><div class="c2-atlas-target" style="color:${hit.color}">◎</div><h3>${esc(hit.label)}</h3><p>${esc(hit.description)}</p><button class="primary-btn" data-action="atlas-open" data-id="${esc(hit.id)}" data-app="${esc(hit.app)}">Открыть запись ↗</button>`;}
 const vis=()=>{if(!document.hidden&&!disposed){cancelAnimationFrame(raf);raf=requestAnimationFrame(frame)}else cancelAnimationFrame(raf)};
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',()=>drag=null);document.addEventListener('visibilitychange',vis);raf=requestAnimationFrame(frame);
 return ()=>{disposed=true;cancelAnimationFrame(raf);ro?.disconnect();document.removeEventListener('visibilitychange',vis);canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);};
}
