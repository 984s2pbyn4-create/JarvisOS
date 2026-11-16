/* Spatial Forge geometry and software 3D projection; self-contained and offline. */
import {getSpatial} from './spatial-data.js';
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const C={cyan:'#3ccaff',blue:'#2277b7',steel:'#566a82',gold:'#ffbd62',mint:'#53e5ba',purple:'#ad9bff',wall:'#316080',floor:'#16465f',charcoal:'#21354b',red:'#ef7c82'};
const cached={};
function meshBox(){const v=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]];const f=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];return {v,f};}
function meshCylinder(segments=16,teeth=0){const v=[],f=[];for(let i=0;i<segments;i++){const a=TAU*i/segments,rad=teeth&&i%4===0?.65:.5;for(const y of [-.5,.5])v.push([Math.cos(a)*rad,y,Math.sin(a)*rad]);}for(let i=0;i<segments;i++){const j=(i+1)%segments;f.push([2*i,2*j,2*j+1,2*i+1]);}f.push(Array.from({length:segments},(_,i)=>2*i+1));f.push(Array.from({length:segments},(_,i)=>2*(segments-i-1)));return {v,f};}
function shape(type){const id=type||'box';if(cached[id])return cached[id];return cached[id]=id==='cyl'?meshCylinder(20):id==='gear'?meshCylinder(32,1):meshBox();}
const obj=(id,label,kind,pos,size,color,extra={})=>({id,label,kind,pos,size,color,...extra});
export function engineeringParts(time=0){
 return [
  obj('base','Несущая рама','box',[0,-1.1,0],[5.6,.25,2.5],C.steel,{explode:[0,-.9,0],detail:'Рама обеспечивает базовую жёсткость макета и соединение узлов.'}),
  obj('gear-a','Ведущая шестерня','gear',[-1.05,.0,.05],[1.35,.46,1.35],C.cyan,{rotY:time*.4,explode:[-2,0,.3],detail:'Демонстрационная шестерня: вращение и разборка связаны с движением.'}),
  obj('gear-b','Ведомая шестерня','gear',[.35,.0,.05],[1.55,.46,1.55],C.gold,{rotY:-time*.37,explode:[1.9,.35,.4],detail:'Ведомое зубчатое колесо получает момент от ведущего (условная кинематика).'}),
  obj('shaft','Выходной вал','cyl',[.35,.65,.05],[.31,1.7,.31],C.steel,{explode:[2.3,1.1,.2],detail:'Вал передаёт крутящий момент за пределы корпуса.'}),
  obj('motor','Корпус привода','cyl',[-2,.01,-.1],[.93,.8,.93],C.purple,{explode:[-3.5,.8,-.6],detail:'Условная модель электропривода. Не используется как технический чертёж.'}),
  obj('sensor','Датчик положения','box',[1.9,-.25,.95],[.54,.5,.55],C.mint,{explode:[3,1.0,1.2],detail:'Датчик, отображающий пример точки контроля положения механизма.'}),
  obj('cover','Защитная крышка','box',[.05,.65,-.12],[4.8,.09,2.15],C.blue,{explode:[.1,2.5,0],alpha:.48,detail:'Съёмный кожух с возможностью скрыть и показать внутренние компоненты.'}),
  obj('bracket','Кронштейн','box',[1.85,-.45,-.65],[.45,1.05,.45],C.steel,{explode:[2.3,.65,-1.8],detail:'Крепление корпуса и датчика к несущей раме.'})
 ];
}
export function apartmentParts(space={}){
 const sofa=!!space.sofa,isl=!!space.island,cur=!!space.curtain;
 return [
  obj('room-floor','Основание демо-комнаты','box',[0,-.92,0],[6.9,.16,5.6],C.floor,{detail:'Условная демонстрационная комната. Не совпадает с обмерами вашей квартиры.'}),
  obj('room-wall-a','Внешняя стена','box',[0,.12,-2.75],[6.9,2.05,.12],C.wall,{alpha:.7,detail:'Контур демонстрационной комнаты.'}),
  obj('room-wall-b','Боковая стена','box',[3.39,.12,0],[.12,2.05,5.6],C.wall,{alpha:.52,detail:'Боковая стена тестовой сцены.'}),
  obj('sofa-base','Диван · сиденье','box',[-1.6,-.45,.65],[2.2,.5,.96],C.cyan,{detail:sofa?'Диван переведён в раскладное положение.':'Диван в сложенном положении.'}),
  obj('sofa-front','Диван · выдвижная часть','box',[-1.6,-.47,sofa?1.48:.95],[2.2,.43,sofa?1.12:.18],C.blue,{detail:'Выдвижной модуль дивана.',hidden:!sofa}),
  obj('sofa-back','Диван · спинка','box',[-1.6,.1,.2],[2.23,.8,.18],C.steel,{detail:'Спинка дивана.'}),
  obj('desk','Рабочий стол','box',[1.5,-.4,-1.25],[1.65,.13,.8],C.gold,{detail:'Рабочий стол, демонстрационный объект.'}),
  obj('desk-leg-a','Ножка стола','box',[.85,-.7,-1.25],[.12,.55,.14],C.steel),
  obj('desk-leg-b','Ножка стола','box',[2.17,-.7,-1.25],[.12,.55,.14],C.steel),
  obj('island','Выдвижной полуостров','box',[isl?1.15:2.45,-.35,1.05],[1.35,.21,1.35],C.mint,{detail:isl?'Полуостров выдвинут.':'Полуостров сложен.'}),
  obj('cabinet','Шкаф','box',[-2.5,.02,-2.1],[.92,1.75,.85],C.steel,{detail:'Наборный шкаф.'}),
  obj('window','Окно','box',[-.15,.25,-2.685],[1.45,1.12,.035],C.cyan,{alpha:.28,detail:'Условное окно тестовой сцены.'}),
  obj('curtain','Штора','box',[-.15,.29,-2.59],[cur?1.45:.22,1.2,.07],C.purple,{alpha:.8,detail:cur?'Шторы закрыты.':'Шторы открыты.'}),
  obj('lamp','Световой модуль','cyl',[1.6,1.13,.25],[.42,.15,.42],space.lights?C.gold:C.charcoal,{detail:space.lights?'Освещение включено.':'Освещение выключено.'})
 ];
}
const hexRgb=x=>{const h=x.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
function tint(hex,f){const rgb=hexRgb(hex);return `rgb(${rgb.map(v=>Math.round(clamp(v*f,0,255))).join(',')})`;}
function coord(x,y,z,cam,w,h){
 const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw),cp=Math.cos(cam.pitch),sp=Math.sin(cam.pitch);
 const rx=cy*x-sy*z, rz=sy*x+cy*z;
 const ry=cp*y-sp*rz,depth=sp*y+cp*rz;
 const f=Math.max(1.2,8.1+depth),scale=Math.min(w,h)*.43*cam.zoom*7.1/f;
 return {x:w/2+rx*scale,y:h*.56-ry*scale,z:depth,scale};
}
export function projectPoint(point,cam,w,h){return coord(...point,cam,w,h)};
function transform(v,o,extra){const [sx,sy,sz]=o.size;const x=v[0]*sx,y=v[1]*sy,z=v[2]*sz;const yaw=o.rotY||0,cy=Math.cos(yaw),sn=Math.sin(yaw);return [x*cy-z*sn+o.pos[0]+(o.explode?.[0]||0)*extra,y+o.pos[1]+(o.explode?.[1]||0)*extra,x*sn+z*cy+o.pos[2]+(o.explode?.[2]||0)*extra]}
function normal(a,b,c){const u=b.map((x,i)=>x-a[i]),v=c.map((x,i)=>x-a[i]);const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];const len=Math.hypot(...n)||1;return n.map(x=>x/len)}
export function drawGrid(ctx,w,h,cam){ctx.save();ctx.lineWidth=1;ctx.strokeStyle='rgba(99,207,241,.12)';for(let a=-6;a<=6;a+=.5){for(const [[x1,z1],[x2,z2]] of [[[-6,a],[6,a]],[[a,-6],[a,6]]]){const p=coord(x1,-1.26,z1,cam,w,h),q=coord(x2,-1.26,z2,cam,w,h);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}}ctx.restore()}
export function drawMeshScene(ctx,w,h,objects,cam,exploded=0,selected=''){
 const faces=[],hit=[];
 for(const o of objects){if(o.hidden)continue;const m=o.customMesh||shape(o.kind),verts=m.v.map(v=>transform(v,o,exploded)),pverts=verts.map(v=>coord(...v,cam,w,h));let bounds={x1:Infinity,y1:Infinity,x2:-Infinity,y2:-Infinity};for(const p of pverts){bounds.x1=Math.min(bounds.x1,p.x);bounds.y1=Math.min(bounds.y1,p.y);bounds.x2=Math.max(bounds.x2,p.x);bounds.y2=Math.max(bounds.y2,p.y)}
 for(const indices of m.f){const face=indices.map(i=>pverts[i]);const world=indices.map(i=>verts[i]);const n=normal(world[0],world[1],world[2]);const light=clamp(.54+n[0]*.16+n[1]*.32+n[2]*.16,.23,1.0);faces.push({id:o.id,face,z:face.reduce((sum,p)=>sum+p.z,0)/face.length,color:tint(o.color,light),alpha:o.alpha??1,selected:o.id===selected});}
 const center=coord(...o.pos,cam,w,h);hit.push({id:o.id,label:o.label,detail:o.detail||'Компонент пространственной сцены',bounds,center,depth:center.z});}
 faces.sort((a,b)=>b.z-a.z);
 for(const f of faces){ctx.beginPath();f.face.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.globalAlpha=f.alpha;ctx.fillStyle=f.color;ctx.fill();ctx.strokeStyle=f.selected?'#c9ffff':'rgba(62,192,241,.28)';ctx.lineWidth=f.selected?1.65:.65;ctx.stroke();}ctx.globalAlpha=1;
 const current=hit.find(x=>x.id===selected);if(current){const {bounds,center}=current;ctx.strokeStyle='rgba(111,244,255,.9)';ctx.lineWidth=1.25;ctx.setLineDash([5,4]);ctx.strokeRect(bounds.x1-5,bounds.y1-5,bounds.x2-bounds.x1+10,bounds.y2-bounds.y1+10);ctx.setLineDash([]);ctx.font='600 12px system-ui';const label=current.label;const mw=ctx.measureText(label).width+19;const lx=clamp(center.x+16,8,w-mw-6),ly=clamp(bounds.y1-22,17,h-15);ctx.fillStyle='rgba(3,29,43,.87)';ctx.fillRect(lx,ly-16,mw,23);ctx.strokeStyle='#61dfff';ctx.strokeRect(lx,ly-16,mw,23);ctx.fillStyle='#b5efff';ctx.fillText(label,lx+10,ly);}
 return hit;
}
export function knowledgeNodes(state,customLinks=[]){
 const hubs=[{id:'hub:projects',label:'ПРОЕКТЫ',kind:'hub',pos:[-2,0,0],color:C.cyan},{id:'hub:notes',label:'ЗАМЕТКИ',kind:'hub',pos:[2,0,.15],color:C.gold},{id:'hub:events',label:'СОБЫТИЯ',kind:'hub',pos:[0,-1.6,1],color:C.mint},{id:'hub:files',label:'ФАЙЛЫ',kind:'hub',pos:[0,1.7,-.6],color:C.purple}];
 const groups=[['projects',state.projects||[],'projects'],['notes',state.notes||[],'notes'],['events',state.events||[],'calendar'],['vault',state.vault||[],'files'],['cards',state.cards||[],'projects']];
 const nodes=[...hubs],links=[];let index=0;
 for(const [kind,items,app] of groups){const hub=kind==='cards'?'projects':kind==='vault'?'files':kind;const center=hubs.find(h=>h.id==='hub:'+hub)?.pos||[0,0,0];for(const item of items.slice(0,kind==='cards'?30:26)){
  const angle=index*2.39996,ring=1.2+.26*(index%4),pos=[center[0]+Math.cos(angle)*ring,center[1]+Math.sin(angle)*ring*.7,center[2]+Math.sin(angle*.8)*1.2];
  const label=(item.title||item.name||item.text||item.id||'Объект').slice(0,68),id=kind+':'+item.id;
  nodes.push({id,label,kind,app,originalId:item.id,pos,color:hubs.find(h=>h.id==='hub:'+hub)?.color||C.blue});links.push([id,'hub:'+hub]);if(kind==='cards'&&item.projectId)links.push([id,'projects:'+item.projectId]);index++;
 }}
 for(const l of customLinks||[]){if(nodes.some(n=>n.id===l.from)&&nodes.some(n=>n.id===l.to))links.push([l.from,l.to]);}
 return {nodes:nodes.slice(0,115),links};
}
export function drawKnowledge(ctx,w,h,state,cam,selected='',customLinks=[]){const {nodes,links}=knowledgeNodes(state,customLinks);const projected=new Map(nodes.map(n=>[n.id,coord(...n.pos,cam,w,h)]));
 ctx.save();for(const [a,b] of links){const p=projected.get(a),q=projected.get(b);if(!p||!q)continue;ctx.strokeStyle='rgba(77,197,235,.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
 const circles=[];nodes.forEach(n=>{const p=projected.get(n.id),r=n.kind==='hub'?11:5.7;ctx.beginPath();ctx.fillStyle=n.id===selected?'#ffffff':n.color;ctx.shadowColor=n.color;ctx.shadowBlur=n.id===selected?22:9;ctx.arc(p.x,p.y,r,0,TAU);ctx.fill();ctx.shadowBlur=0;if(n.kind==='hub'||n.id===selected){ctx.fillStyle='#c7ecff';ctx.font=n.kind==='hub'?'600 12px system-ui':'11px system-ui';ctx.fillText(n.label,p.x+r+7,p.y+4);}circles.push({id:n.id,x:p.x,y:p.y,r:r+10,node:n});});ctx.restore();return circles;}
export const SPATIAL_SCENE_NAMES={engineering:'ENGINEERING LAB',space:'SMART SPACE',knowledge:'KNOWLEDGE UNIVERSE',ar:'AR PROJECTOR'};

// Bounded Wavefront OBJ reader for locally opened engineering models.
export function parseOBJ(text){
 if(typeof text!=='string'||text.length>10_000_000)throw Error('OBJ слишком большой (максимум 10 МБ)');
 const vertices=[],faces=[];
 for(const line of text.split(/\r?\n/)){const t=line.trim().split(/\s+/);if(t[0]==='v'&&t.length>=4){
 const v=t.slice(1,4).map(Number);if(v.some(x=>!Number.isFinite(x)))throw Error('Неверные координаты OBJ');vertices.push(v);if(vertices.length>15000)throw Error('Слишком много вершин');
 }else if(t[0]==='f'&&t.length>=4){const indices=t.slice(1).map(s=>parseInt(s.split('/')[0],10)).map(i=>i<0?vertices.length+i:i-1);if(indices.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))throw Error('Некорректная грань OBJ');
 for(let i=1;i<indices.length-1;i++)faces.push([indices[0],indices[i],indices[i+1]]);if(faces.length>3500)throw Error('Слишком сложная модель для локального просмотра (максимум 3500 треугольников)');}
 }
 if(!vertices.length||!faces.length)throw Error('OBJ должен содержать вершины и грани');
 const center=[0,1,2].map(i=>(Math.min(...vertices.map(v=>v[i]))+Math.max(...vertices.map(v=>v[i])))/2);
 const scale=Math.max(...vertices.flatMap(v=>v.map((x,i)=>Math.abs(x-center[i]))))||1;
 return {v:vertices.map(v=>v.map((x,i)=>(x-center[i])/scale*.48)),f:faces};
}
