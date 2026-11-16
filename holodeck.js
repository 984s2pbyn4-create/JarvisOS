/**
 * JARVIS HOLO DECK — cinematic, touch-first, offline Canvas 2D experiences.
 * No WebGL requirement, no external services, no microphone access.
 * All displayed system activity is either explicitly demo or sourced locally.
 */
const TAU=Math.PI*2;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const APPS=[
  {id:'notes',name:'Заметки',a:0.0,desc:'Локальные записи и идеи'},
  {id:'projects',name:'Проекты',a:1.05,desc:'Канбан и рабочие планы'},
  {id:'audio',name:'Audio Lab',a:2.10,desc:'Звуковая лаборатория'},
  {id:'calendar',name:'Календарь',a:3.15,desc:'События и встречи'},
  {id:'vault',name:'Файлы',a:4.20,desc:'Локальные документы'},
  {id:'focus',name:'Фокус',a:5.25,desc:'Концентрация и таймер'}
];
const BODIES=[
 {name:'Солнце',r:0,size:18,color:'#ffda7d',info:'Звезда в центре Солнечной системы. Это интерактивная схема, расстояния не в масштабе.'},
 {name:'Меркурий',r:.16,size:3,color:'#b6bbcb',info:'Ближайшая к Солнцу планета. Орбитальный период около 88 земных суток.'},
 {name:'Венера',r:.27,size:5,color:'#e6ba7c',info:'Самая горячая планета Солнечной системы. Плотная атмосфера из CO₂.'},
 {name:'Земля',r:.38,size:6,color:'#59acff',info:'Наш дом. Единственная планета с подтверждённой жизнью.'},
 {name:'Марс',r:.48,size:4,color:'#ff785c',info:'Красная планета. На поверхности находится Олимп, гигантский вулкан.'},
 {name:'Юпитер',r:.65,size:11,color:'#dcb68e',info:'Крупнейшая планета. Газовый гигант с Большим красным пятном.'},
 {name:'Сатурн',r:.76,size:9,color:'#e8d1a4',info:'Газовый гигант, знаменитый своей системой колец.'},
 {name:'Уран',r:.87,size:7,color:'#91e5e3',info:'Ледяной гигант с сильно наклонённой осью вращения.'},
 {name:'Нептун',r:.98,size:7,color:'#6a89ff',info:'Далёкий ледяной гигант с чрезвычайно быстрыми ветрами.'}
];
export function holoDeckView(){return `
<div class="hdeck-root" data-holo-mode="core">
 <div class="hdeck-title-row"><div><span class="overline">JARVIS EXPERIMENTAL EXPERIENCE / 01</span><h2>HOLO DECK <em>LIVE</em></h2><p>Четыре интерактивных пространства. Всё работает на iPad, без сервера.</p></div><span class="hdeck-version">IMMERSIVE · OFFLINE</span></div>
 <div class="hdeck-toolbar" role="group" aria-label="Режимы голограммы">
  <button class="hdeck-mode active" data-holo-mode-select="core" aria-pressed="true">◈ Нейроядро</button>
  <button class="hdeck-mode" data-holo-mode-select="space" aria-pressed="false">◌ Солнечная система</button>
  <button class="hdeck-mode" data-holo-mode-select="audio" aria-pressed="false">▥ Музыкальный реактор</button>
  <button class="hdeck-mode" data-holo-mode-select="training" aria-pressed="false">✦ Аркада: перехват</button>
  <button class="hdeck-reset" data-holo-reset="1" title="Сбросить положение">↺ Сброс</button>
 </div>
 <div class="hdeck-stage">
  <canvas class="hdeck-canvas" aria-label="Интерактивная голографическая сцена, вращайте одним пальцем и масштабируйте двумя" role="img"></canvas>
  <div class="hdeck-scanner" aria-hidden="true"></div>
  <div class="hdeck-stage-top"><span class="hdeck-live-dot"></span><span class="hdeck-scene-name">NEURAL CORE</span><span class="hdeck-live-stats">LOCAL RENDER</span></div>
  <div class="hdeck-reading"><span class="hdeck-reading-kicker">АКТИВНЫЙ ОБЪЕКТ</span><strong class="hdeck-object">JARVIS CORE</strong><p class="hdeck-description">Вращайте ядро пальцем. Коснитесь спутника, чтобы открыть настоящий модуль.</p></div>
  <div class="hdeck-hint">✦ ВРАЩЕНИЕ: 1 ПАЛЕЦ &nbsp; · &nbsp; МАСШТАБ: 2 ПАЛЬЦА &nbsp; · &nbsp; ВЫБОР: КАСАНИЕ</div>
 </div>
 <div class="hdeck-game-panel" hidden><button type="button" class="hdeck-start-game">ЗАПУСТИТЬ МИССИЮ</button><span class="hdeck-game-score">Цель: касайтесь светящихся объектов. Счёт 0</span></div>
 <div class="hdeck-audio-panel" hidden>
  <label class="hdeck-file-label" for="hdeck-audio-file">♫ Выбрать музыку с iPad</label>
  <input type="file" accept="audio/*" class="hdeck-audio-input" id="hdeck-audio-file" hidden>
  <audio class="hdeck-player" controls playsinline preload="none"></audio>
  <small class="hdeck-audio-status">До выбора файла работает только демонстрационная анимация. Микрофон не используется.</small>
 </div>
 <div class="hdeck-shortcuts"><span class="hdeck-shortcuts-label">БЫСТРЫЙ ЗАПУСК ИЗ ЯДРА</span><div class="hdeck-shortcut-list">${APPS.map(a=>`<button data-action="open" data-app="${a.id}">${a.name} ↗</button>`).join('')}</div></div>
 <p class="hdeck-footnote">Интерактивная визуализация: орбиты условные, а музыка анализируется только после выбора локального файла. Показатели не имитируют датчики iPadOS.</p>
</div>`;}

/** Creates and tears down a view; safe for two window instances. */
export function initHoloDeck(root,{reduced=false,onLaunch=()=>{}}={}){
 if(!root)return ()=>{};
 const canvas=root.querySelector('canvas');const ctx=canvas?.getContext('2d',{alpha:false});
 if(!ctx)return ()=>{};
 const label=root.querySelector('.hdeck-object'),desc=root.querySelector('.hdeck-description');
 const sceneName=root.querySelector('.hdeck-scene-name');
 const status=root.querySelector('.hdeck-live-stats');
 const audioPanel=root.querySelector('.hdeck-audio-panel');
 const gamePanel=root.querySelector('.hdeck-game-panel');
 const gameButton=root.querySelector('.hdeck-start-game');
 const gameScore=root.querySelector('.hdeck-game-score');
 const fileInput=root.querySelector('.hdeck-audio-input');
 const player=root.querySelector('.hdeck-player');
 const audioStatus=root.querySelector('.hdeck-audio-status');
 const motionReduced=reduced||!!window.matchMedia?.('(prefers-reduced-motion:reduce)').matches;
 let mode='core',yaw=.12,pitch=-.22,zoom=1,raf=0,last=0,dead=false,phase=0;
 let selection=null,targets=[],pointerMoved=false,startingDistance=0,baseZoom=1;
 let audioContext=null,analyser=null,source=null,audioURL=null,bins=null;
 const game={active:false,score:0,hits:0,misses:0,endsAt:0,target:{x:.72,y:.46}};
 const pointers=new Map();
 const accent=()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#62dbff';
 const stars=Array.from({length:140},(_,i)=>({x:Math.sin(i*127.1)*.5+.5,y:Math.sin(i*47.2+7)*.5+.5,alpha:.15+.5*((i*53)%13)/13,r:(i%9===0?1.4:.7)}));
 const floaters=Array.from({length:110},(_,i)=>({x:Math.sin(i*27.8)*.96,y:Math.cos(i*72.5)*.87,z:Math.sin(i*3.71)*.95}));
 function setSelected(name,info){if(label)label.textContent=name;if(desc)desc.textContent=info;}
 function setMode(next){
   if(!['core','space','audio','training'].includes(next))return;
   if(mode==='audio'&&next!=='audio')player.pause();
   mode=next;selection=null;targets=[];zoom=1;yaw=.12;pitch=-.22;root.dataset.holoMode=next;
   root.querySelectorAll('[data-holo-mode-select]').forEach(b=>{const active=b.dataset.holoModeSelect===next;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
   audioPanel.hidden=next!=='audio';gamePanel.hidden=next!=='training';
   if(next!=='training')game.active=false;
   if(sceneName)sceneName.textContent={core:'NEURAL CORE',space:'SOLAR EXPLORER',audio:'AUDIO REACTOR',training:'TARGET PROTOCOL'}[next];
   if(next==='core')setSelected('JARVIS CORE','Коснитесь любого спутника: это реальные модули JARVIS OS.');
   if(next==='space')setSelected('СОЛНЕЧНАЯ СИСТЕМА','Нажмите на планету, чтобы узнать интересный факт. Размеры и расстояния условные.');
   if(next==='audio')setSelected('AUDIO REACTOR','Загрузите аудиофайл с iPad. Спектр визуализируется в реальном времени во время воспроизведения.');
   if(next==='training')setSelected('ПРОТОКОЛ ПЕРЕХВАТ','Коснитесь кнопки запуска, затем ловите светящиеся цели. За 30 секунд наберите максимум очков!');
 }
 function setupAudio(){
   if(audioContext||!player.src)return;
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC){audioStatus.textContent='Web Audio недоступен в этом браузере';return;}
   try{audioContext=new AC();analyser=audioContext.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.8;bins=new Uint8Array(analyser.frequencyBinCount);source=audioContext.createMediaElementSource(player);source.connect(analyser);analyser.connect(audioContext.destination);audioContext.resume().catch(()=>{});}catch(e){audioStatus.textContent='Не удалось создать аудиоанализатор';}
 }
 const onFile=()=>{
   const file=fileInput.files?.[0];if(!file)return;
   if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}
   player.pause();
   audioURL=URL.createObjectURL(file);player.src=audioURL;
   audioStatus.textContent=`Выбрано: ${file.name}. Нажмите воспроизведение. Файл остаётся на устройстве.`;
 };
 fileInput.addEventListener('change',onFile);
 const onPlay=()=>{setupAudio();audioContext?.resume().catch(()=>{});};
 player.addEventListener('play',onPlay);
 const keyColors=()=>({line:accent(),blue:'#1f88f6',white:'#c8eeff'});
 function projected(x,y,z,w,h,scale){
   const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
   const rx=x*cy+z*sy,rz=z*cy-x*sy,ry=y*cp-rz*sp,rz2=y*sp+rz*cp;
   const perspective=2.8/(2.8-rz2*.39);
   return {x:w/2+rx*scale*perspective,y:h/2+ry*scale*perspective,z:rz2,k:perspective};
 }
 function line3(points,w,h,s,opacity,color,thickness=1){
   ctx.beginPath();points.forEach((p,i)=>{const q=projected(p[0],p[1],p[2],w,h,s);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.globalAlpha=opacity;ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.stroke();ctx.globalAlpha=1;
 }
 function circle3(radius,plane,w,h,s,opacity,color,thickness=1){const points=[];for(let i=0;i<=90;i++){const a=i/90*TAU;points.push(plane===0?[Math.cos(a)*radius,Math.sin(a)*radius,0]:plane===1?[Math.cos(a)*radius,0,Math.sin(a)*radius]:[0,Math.cos(a)*radius,Math.sin(a)*radius]);}line3(points,w,h,s,opacity,color,thickness);}
 function orb(x,y,r,color,bright=1){ctx.save();const glow=ctx.createRadialGradient(x,y,0,x,y,r*4);glow.addColorStop(0,color);glow.addColorStop(.2,color+'88');glow.addColorStop(1,'transparent');ctx.fillStyle=glow;ctx.globalAlpha=.35*bright;ctx.beginPath();ctx.arc(x,y,r*4,0,TAU);ctx.fill();ctx.restore();ctx.fillStyle=color;ctx.globalAlpha=bright;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.globalAlpha=1;}
 function bg(w,h,t){
   ctx.fillStyle='#030914';ctx.fillRect(0,0,w,h);
   const g=ctx.createRadialGradient(w*.52,h*.46,2,w*.52,h*.46,Math.max(w,h)*.73);
   g.addColorStop(0,'#09253e');g.addColorStop(.52,'#061426');g.addColorStop(1,'#020611');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
   ctx.save();for(const p of stars){const a=p.alpha*(.8+.2*Math.sin(phase*1.8+p.x*18));ctx.globalAlpha=a;ctx.fillStyle='#c8eeff';ctx.fillRect(p.x*w,p.y*h,p.r,p.r);}ctx.restore();
   ctx.strokeStyle='rgba(98,219,255,.065)';ctx.lineWidth=.6;
   const unit=38;for(let x=w*.5%unit;x<w;x+=unit){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
   for(let y=h*.5%unit;y<h;y+=unit){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
   const sweep=(phase*.07)%1;ctx.fillStyle='rgba(72,166,224,.045)';ctx.fillRect(0,h*sweep-1,w,3);
 }
 function coreScene(w,h,t){
   const color=accent(),s=Math.min(w*.30,h*.43)*zoom;
   targets=[];
   ctx.save();const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,s*1.75);g.addColorStop(0,'rgba(39,204,250,.16)');g.addColorStop(1,'rgba(1,7,17,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(w/2,h/2,s*1.75,0,TAU);ctx.fill();ctx.restore();
   for(let i=0;i<9;i++)circle3(.6+i*.092,i%3,w,h,s,.09+i*.007,color,.8);
   for(let i=0;i<5;i++){
     const r=.73+i*.15,start=phase*(i%2?-.31:.22)+i*1.4;
     const points=[];for(let j=0;j<90;j++){const a=start+j/90*TAU*.6;points.push([r*Math.cos(a),r*Math.sin(a)*(i%3===1?.33:.77),r*Math.sin(a)*(i%3===1?.9:.4)]);}
     line3(points,w,h,s,.64,color,i===0?2.6:1.3);
   }
   for(let i=0;i<floaters.length;i++){
     const p=floaters[i];const q=projected(p.x*.86,p.y*.79,p.z*.78,w,h,s);
     ctx.fillStyle=i%8===0?'#bbf6ff':color;ctx.globalAlpha=(q.z+.9)/2.4*.5;ctx.beginPath();ctx.arc(q.x,q.y,i%7===0?1.5:.7,0,TAU);ctx.fill();
   }ctx.globalAlpha=1;
   const core=projected(0,0,0,w,h,s);orb(core.x,core.y,22*clamp(s/130,.65,1.3),color,1);
   ctx.save();ctx.textAlign='center';ctx.fillStyle='#e9fdff';ctx.font=`700 ${Math.round(clamp(s*.19,23,46))}px system-ui`;ctx.fillText('J',core.x,core.y+12);ctx.restore();
   for(const app of APPS){
     const a=app.a+phase*.11,p=projected(Math.sin(a)*1.07,Math.cos(a*.8)*.58,Math.cos(a)*.66,w,h,s);
     orb(p.x,p.y,clamp(s*.034,5,9),color,.96);
     const dx=p.x>w/2?13:-13;ctx.fillStyle='#cbeaff';ctx.textAlign=dx>0?'left':'right';ctx.font=`${w<520?11:12}px system-ui`;
     const width=ctx.measureText(app.name).width;
     targets.push({x:p.x,y:p.y,r:25,type:'app',data:app,label:{left:dx>0?p.x+dx-4:p.x+dx-width-4,right:dx>0?p.x+dx+width+4:p.x+dx+4,top:p.y-23,bottom:p.y+1}});
     ctx.fillText(app.name,p.x+dx,p.y-9);
   }
 }
 function spaceScene(w,h,t){
   const color=accent(),s=Math.min(w*.35,h*.49)*zoom;
   targets=[];
   for(let i=8;i>0;i--){const r=BODIES[i].r*1.12;const pts=[];for(let j=0;j<=100;j++){const a=j/100*TAU;pts.push([Math.cos(a)*r,0,Math.sin(a)*r]);}line3(pts,w,h,s,.19,color,.9);}
   // Mars + outer bodies spin slower than the inner planets: illustrative, not a scientific time scale.
   const bodies=BODIES.map((b,i)=>{
     const a=i*1.93+phase*(i?(.14/Math.sqrt(i)):.02);
     const p=projected(Math.cos(a)*b.r*1.12,0,Math.sin(a)*b.r*1.12,w,h,s);
     return {...b,p,i};
   }).sort((a,b)=>a.p.z-b.p.z);
   for(const b of bodies){
     const radius=b.size*(w<460?.75:1)*Math.sqrt(zoom);
     orb(b.p.x,b.p.y,radius,b.color,1);targets.push({x:b.p.x,y:b.p.y,r:Math.max(22,radius*2),type:'planet',data:b});
     if(b.name==='Сатурн'){
       ctx.save();ctx.strokeStyle='rgba(255,216,156,.82)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(b.p.x,b.p.y,radius*1.8,radius*.7,-.42,0,TAU);ctx.stroke();ctx.restore();
     }
     ctx.font='11px system-ui';ctx.textAlign='center';ctx.fillStyle='#c6dfef';ctx.globalAlpha=.95;ctx.fillText(b.name,b.p.x,b.p.y-radius-10);ctx.globalAlpha=1;
   }
 }
 function trainingScene(w,h,t){
   const color=accent(),mx=w/2,my=h/2,scale=Math.min(w,h)*.38;
   ctx.save();ctx.strokeStyle='rgba(67,193,244,.17)';ctx.lineWidth=1;
   for(let i=1;i<=5;i++){ctx.beginPath();ctx.arc(mx,my,scale*i/5,0,TAU);ctx.stroke();}
   for(let a=0;a<TAU;a+=Math.PI/6){ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(mx+Math.cos(a)*scale,my+Math.sin(a)*scale);ctx.stroke();}
   ctx.restore();
   if(game.active&&Date.now()>=game.endsAt){game.active=false;gameButton.textContent='НОВАЯ МИССИЯ';setSelected('МИССИЯ ЗАВЕРШЕНА',`Результат: ${game.score} очков, точных попаданий: ${game.hits}.`);}
   if(game.active){
     const x=game.target.x*w,y=game.target.y*h,pulse=Math.sin(phase*9)*3;
     ctx.strokeStyle='#ffb26a';ctx.shadowColor='#ff9558';ctx.shadowBlur=23;ctx.lineWidth=2.8;
     for(const r of [19+pulse,32+pulse]){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
     ctx.beginPath();ctx.moveTo(x-42,y);ctx.lineTo(x-17,y);ctx.moveTo(x+17,y);ctx.lineTo(x+42,y);
     ctx.moveTo(x,y-42);ctx.lineTo(x,y-17);ctx.moveTo(x,y+17);ctx.lineTo(x,y+42);ctx.stroke();ctx.shadowBlur=0;
     orb(x,y,6,'#ffbd72',1);
     const secs=Math.max(0,Math.ceil((game.endsAt-Date.now())/1000));
     if(status)status.textContent=`ЦЕЛЬ ${game.hits+1} / ${secs} СЕК`;
   }else if(status)status.textContent='МИССИЯ ОЖИДАЕТ ЗАПУСКА';
   if(gameScore)gameScore.textContent=`Счёт: ${game.score} · попадания: ${game.hits} · промахи: ${game.misses} ${game.active?'· 30 секунд на миссию':''}`;
 }
 const newTarget=()=>{game.target={x:.18+Math.random()*.64,y:.2+Math.random()*.58};};
 const startGame=()=>{game.active=true;game.score=0;game.hits=0;game.misses=0;game.endsAt=Date.now()+30000;newTarget();gameButton.textContent='ПЕРЕЗАПУСТИТЬ';setSelected('МИССИЯ АКТИВНА','Перехватывайте цели касаниями. Время ограничено 30 секундами.');};
 gameButton?.addEventListener('click',startGame);
 function audioScene(w,h,t){
   const color=accent(),s=Math.min(w*.33,h*.44)*zoom;
   let samples=new Uint8Array(128),hasReal=!!(analyser&&player.src&&!player.paused);
   if(hasReal){analyser.getByteFrequencyData(bins);for(let i=0;i<128;i++)samples[i]=bins[Math.min(bins.length-1,Math.floor(i*bins.length/128))];}
   else for(let i=0;i<128;i++)samples[i]=Math.round(28+26*(.5+.5*Math.sin(i*.24+phase*2)));
   let strength=0;
   for(let i=0;i<128;i++)strength+=samples[i];strength/=128*255;
   for(let ring=0;ring<4;ring++)circle3(.53+ring*.13,ring%3,w,h,s,.13,color,.7);
   const pts=[],cnt=128;
   for(let i=0;i<cnt;i++){
     const a=i/cnt*TAU,amp=samples[i]/255,inner=.59,outer=.59+amp*.67;
     const c=Math.cos(a),si=Math.sin(a);
     const p=projected(inner*c,inner*si,.1*Math.sin(phase+a*2),w,h,s);
     const q=projected(outer*c,outer*si,.12*Math.sin(phase+a*2),w,h,s);
     ctx.strokeStyle= i%4===0?'#c8f7ff':color;
     ctx.globalAlpha=.42+amp*.6;ctx.lineWidth=1.6+amp*2.4;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
   }ctx.globalAlpha=1;
   const r=15+strength*42;orb(w/2,h/2,r,color,.9);
   ctx.fillStyle='#e9fcff';ctx.font='700 17px system-ui';ctx.textAlign='center';ctx.fillText('AUDIO',w/2,h/2+6);
   if(status)status.textContent=hasReal?'FFT / LIVE AUDIO':'FFT / DEMO ONLY';
 }
 function render(now){
   if(dead)return;raf=requestAnimationFrame(render);
   if(document.hidden||now-last<1000/(motionReduced?9:34))return;
   const dt=last?(now-last)/1000:0;last=now;if(!motionReduced)phase+=Math.min(.06,dt);
   const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;
   if(w<1||h<1)return;
   const dpr=Math.min(window.devicePixelRatio||1,1.6);const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
   if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
   ctx.setTransform(dpr,0,0,dpr,0,0);bg(w,h,now);
   if(mode==='core')coreScene(w,h,now);else if(mode==='space')spaceScene(w,h,now);else if(mode==='audio')audioScene(w,h,now);else trainingScene(w,h,now);
 }
 const getLocal=(event)=>{const b=canvas.getBoundingClientRect();return {x:event.clientX-b.left,y:event.clientY-b.top};};
 const distance=()=>{const a=[...pointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y);};
 const onDown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointerMoved=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId)}catch{}if(pointers.size===2){startingDistance=distance();baseZoom=zoom;}};
 const onMove=e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;
   if(Math.abs(dx)+Math.abs(dy)>1)pointerMoved=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(pointers.size===2&&startingDistance){zoom=clamp(baseZoom*distance()/startingDistance,.6,2.1);}
   else{yaw+=dx*.008;pitch=clamp(pitch+dy*.008,-1.2,1.2);} };
 const onUp=e=>{
   if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);
   if(!pointerMoved&&mode==='training'&&game.active){
     const pt=getLocal(e),b=canvas.getBoundingClientRect();
     if(Math.hypot(game.target.x*b.width-pt.x,game.target.y*b.height-pt.y)<48){game.score+=10;game.hits++;newTarget();setSelected('ЦЕЛЬ ПОРАЖЕНА',`Попаданий: ${game.hits}. Очки: ${game.score}.`);}else{game.misses++;}
   }
   if(!pointerMoved&&mode!=='audio'&&mode!=='training'){
     const pt=getLocal(e),hit=targets.filter(t=>Math.hypot(t.x-pt.x,t.y-pt.y)<t.r||(t.label&&pt.x>=t.label.left&&pt.x<=t.label.right&&pt.y>=t.label.top&&pt.y<=t.label.bottom)).sort((a,b)=>Math.hypot(a.x-pt.x,a.y-pt.y)-Math.hypot(b.x-pt.x,b.y-pt.y))[0];
     if(hit?.type==='app'){setSelected(hit.data.name,hit.data.desc+' · Открываю приложение…');onLaunch(hit.data.id);}
     if(hit?.type==='planet')setSelected(hit.data.name,hit.data.info);
   }
   if(pointers.size<2)startingDistance=0;
 };
 const onCancel=e=>{pointers.delete(e.pointerId);startingDistance=0;};
 canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onCancel);
 const modes=[...root.querySelectorAll('[data-holo-mode-select]')],modeClick=e=>setMode(e.currentTarget.dataset.holoModeSelect);
 for(const b of modes)b.addEventListener('click',modeClick);
 const reset=root.querySelector('[data-holo-reset]'),onReset=()=>{yaw=.12;pitch=-.22;zoom=1;};reset?.addEventListener('click',onReset);
 setMode('core');raf=requestAnimationFrame(render);
 return ()=>{dead=true;cancelAnimationFrame(raf);canvas.removeEventListener('pointerdown',onDown);canvas.removeEventListener('pointermove',onMove);canvas.removeEventListener('pointerup',onUp);canvas.removeEventListener('pointercancel',onCancel);for(const b of modes)b.removeEventListener('click',modeClick);reset?.removeEventListener('click',onReset);gameButton?.removeEventListener('click',startGame);fileInput.removeEventListener('change',onFile);player.removeEventListener('play',onPlay);player.pause();player.removeAttribute('src');player.load();if(audioURL)URL.revokeObjectURL(audioURL);if(audioContext)audioContext.close().catch(()=>{});};
}
