/* JARVIS OS · FLIGHT BRIDGE 1.2 — standalone procedural scene, offline and touch-first.
 * It is a fictional exploration simulation, not a model of real spacecraft or astronomy.
 * Does not use microphone, geolocation, network or external assets. */
const ESC=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const SECTORS=[
 {id:'A-01',name:'AURORA',subtitle:'Океаническая планета',color:[.13,.52,.94],light:[.24,.84,1],ambient:'#38d4ff',coords:'X 038.19 · Y 018.44',description:'Мерцающие облака и глубокий океан. Атмосферный анализ показывает повышенную влажность.',discovery:'Обнаружены следы сложных атмосферных образований. Маршрут разведки обновлён.',seed:1.0},
 {id:'K-07',name:'KRYPTON',subtitle:'Кристаллическая пустошь',color:[.57,.23,.83],light:[.95,.45,1],ambient:'#d78cff',coords:'X 104.60 · Y 072.31',description:'Плотная облачность и фиолетовые минеральные массивы. Регистрируются магнитные аномалии.',discovery:'Зафиксирована геометрическая структура в магнитных полях. Координаты сохранены.',seed:3.1},
 {id:'V-12',name:'VESTA PRIME',subtitle:'Вулканический мир',color:[.84,.31,.09],light:[1,.66,.23],ambient:'#ffb05c',coords:'X 207.42 · Y 096.08',description:'Светящиеся лавовые потоки и плотная пылевая оболочка. Требуется защита сенсоров.',discovery:'В северном секторе зарегистрировано необычное тепловое пятно.',seed:5.4},
 {id:'N-22',name:'NOCTIS',subtitle:'Ледяной гигант',color:[.22,.68,.67],light:[.58,1,.84],ambient:'#82ffd5',coords:'X 014.08 · Y 243.67',description:'Холодная атмосфера и быстрые верхние ветры. Дальний радар фиксирует ледяные кольца.',discovery:'Обнаружен устойчивый резонанс в верхнем слое атмосферы.',seed:8.2},
];
const LS_KEY='jarvis-flight-bridge-v1';
function loadFlight(){try{const obj=JSON.parse(localStorage.getItem(LS_KEY)||'{}');return {sector:Math.max(0,Math.min(3,Number(obj.sector)||0)),discoveries:obj.discoveries&&typeof obj.discoveries==='object'?obj.discoveries:{},jumps:Math.max(0,Math.min(9999,Number(obj.jumps)||0)),sound:!!obj.sound}}catch{return {sector:0,discoveries:{},jumps:0,sound:false}}}
const load=()=>loadFlight();
export function bridgeView(userState={}){
 const x=load(),sector=SECTORS[x.sector],tasks=(userState.tasks||[]).filter(t=>!t.done), events=(userState.events||[]).filter(e=>new Date(e.start).getTime()>=Date.now()).sort((a,b)=>String(a.start).localeCompare(String(b.start))), next=events[0];
 const later=next?`${new Date(next.start).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · ${ESC(next.title)}`:'Нет ближайших событий';
 return `<section class="bridge-root" id="bridge-root" aria-label="Интерактивный командный мостик">
  <canvas class="bridge-gl" id="bridge-gl" aria-hidden="true"></canvas><canvas class="bridge-overlay" id="bridge-overlay" aria-hidden="true"></canvas>
  <div class="bridge-vignette"></div><div class="bridge-grain"></div>
  <header class="bridge-header"><div class="bridge-id"><span class="bridge-mark">J</span><span><b>JARVIS <em>MISSION CONTROL</em></b><small>FLIGHT DECK · SIMULATION / V1.2</small></span></div><div class="bridge-header-right"><span class="bridge-online"><i></i> СИСТЕМЫ В НОРМЕ</span><button class="bridge-quiet" id="bridge-sound" aria-label="Включить или выключить звуки">${x.sound?'♫ ЗВУК ВКЛ':'♪ ЗВУК ВЫКЛ'}</button><button class="bridge-exit" data-action="close-pane" data-pane="primary" aria-label="Закрыть мостик">✕ <span>ВЫХОД</span></button></div></header>
  <div class="bridge-left">
   <div class="bridge-minor"><span class="bridge-led"></span> ACTIVE SECTOR <span class="bridge-index">${sector.id}</span></div>
   <h1 id="bridge-sector-title">${sector.name}</h1><p id="bridge-sector-sub">${sector.subtitle}</p>
   <div class="bridge-coords">COORDINATES <strong id="bridge-coords">${sector.coords}</strong></div>
   <div class="bridge-separator"></div>
   <div class="bridge-dials"><div><span>ТЯГА</span><strong id="bridge-thrust">46%</strong><div class="bridge-track"><i id="bridge-thrust-bar" style="width:46%"></i></div></div><div><span>РЕАКТОР</span><strong id="bridge-reactor">82%</strong><div class="bridge-track"><i id="bridge-reactor-bar" style="width:82%"></i></div></div><div><span>СКАНЕР</span><strong id="bridge-sensor">ГОТОВ</strong><div class="bridge-track"><i id="bridge-sensor-bar" style="width:100%"></i></div></div></div>
   <div class="bridge-visual-hint">ПРОВЕДИТЕ ПАЛЬЦЕМ ПО ПЛАНЕТЕ<br>ДВУМЯ ПАЛЬЦАМИ ИЗМЕНИТЕ МАСШТАБ</div>
  </div>
  <div class="bridge-planet-caption"><span>HOLOGRAPHIC VISUAL FEED</span><strong id="bridge-feed">ORBITAL LOCK · STABLE</strong></div>
  <div class="bridge-right"><div class="bridge-panel-title">КОМАНДНЫЕ ПРОТОКОЛЫ <span>01/04</span></div>
   <div class="bridge-sector-picks" role="group" aria-label="Выбор сектора">${SECTORS.map((s,i)=>`<button class="bridge-sector ${i===x.sector?'active':''}" data-sector="${i}" aria-pressed="${i===x.sector}"><span class="bridge-sector-dot" style="--sector:${s.ambient}"></span><span><strong>${s.name}</strong><small>${s.id} / ${s.subtitle}</small></span><span class="bridge-sector-arrow">↗</span></button>`).join('')}</div>
   <div class="bridge-action-grid"><button id="bridge-warp" class="bridge-primary">◈ <span><strong>ГИПЕРПРЫЖОК</strong><small>Переход в выбранный сектор</small></span></button><button id="bridge-scan" class="bridge-secondary">⌁ <span><strong>СКАНИРОВАТЬ</strong><small>Анализ текущей планеты</small></span></button></div>
   <div class="bridge-slider-line"><label for="bridge-throttle">ТЯГА ДВИГАТЕЛЯ</label><b id="bridge-throttle-value">46%</b></div><input type="range" id="bridge-throttle" class="bridge-slider" min="0" max="100" value="46" aria-label="Тяга двигателя"/>
   <div class="bridge-panel-foot">Для прыжка необходима тяга не менее 55%. Это игровая симуляция.</div>
   <div class="bridge-log"><div class="bridge-log-header">ЖУРНАЛ МИССИИ <span id="bridge-log-clock">--:--:--</span></div><p id="bridge-log-line">Системы готовы. Выберите сектор и начните операцию.</p><div class="bridge-log-foot"><span id="bridge-jumps">Переходов: ${x.jumps}</span><span id="bridge-discoveries">Открытий: ${Object.keys(x.discoveries).length}/4</span></div></div>
  </div>
  <footer class="bridge-bottom"><div class="bridge-bottom-left"><span class="bridge-bottom-label">DAILY BRIEFING · РЕАЛЬНЫЕ ДАННЫЕ JARVIS</span><strong>${tasks.length} активных задач</strong><small>${later}</small></div><div class="bridge-bottom-buttons"><button data-action="open" data-app="tasks">ЗАДАЧИ ↗</button><button data-action="open" data-app="calendar">КАЛЕНДАРЬ ↗</button><button data-action="open" data-app="focus">ФОКУС ↗</button></div></footer>
  <div id="bridge-message" class="bridge-message" role="status" aria-live="polite"></div>
 </section>`;
}

const VS=`attribute vec2 a_pos;varying vec2 v_uv;void main(){v_uv=a_pos*.5+.5;gl_Position=vec4(a_pos,0.,1.);}`;
const FS=`precision highp float;
varying vec2 v_uv;uniform vec2 u_res;uniform float u_time;uniform vec2 u_rot;uniform float u_zoom;uniform float u_warp;uniform float u_scan;uniform float u_throttle;uniform float u_seed;uniform vec3 u_main;uniform vec3 u_light;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(hash(vec2(n,n)),hash(vec2(n+1.,n+1.)),f.x),mix(hash(vec2(n+57.,n+57.)),hash(vec2(n+58.,n+58.)),f.x),f.y),mix(mix(hash(vec2(n+113.,n+113.)),hash(vec2(n+114.,n+114.)),f.x),mix(hash(vec2(n+170.,n+170.)),hash(vec2(n+171.,n+171.)),f.x),f.y),f.z);}
float terrain(vec3 p){return noise(p*2.0)*.58+noise(p*5.4)*.28+noise(p*12.5)*.14;}
vec3 rotate(vec3 p){float sy=sin(u_rot.x),cy=cos(u_rot.x),sp=sin(u_rot.y),cp=cos(u_rot.y);p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);return vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;
 float t=u_time;
 vec2 center=vec2(.075,-.01);float rad=.43*u_zoom;
 vec2 p=uv-center;float d=length(p);
 vec3 col=vec3(.005,.014,.032);
 // Deep-space cloud, not a camera or live space feed.
 vec2 neb=uv*1.8+vec2(u_seed,2.4);
 float cloud=noise(vec3(neb*.68,t*.006))*noise(vec3(neb*1.7,1.2));
 col+=vec3(.019,.058,.102)*pow(cloud,2.)*1.9;
 float stripe=exp(-pow((uv.y+uv.x*.27+.08)*3.0,2.));col+=u_main*.04*stripe*cloud;
 vec2 starId=floor(v_uv*u_res.xy/29.0),local=fract(v_uv*u_res.xy/29.0)-.5;
 float star=hash(starId);float bright=step(.985,star)*pow(max(0.,1.-length(local)*5.),4.);
 col+=vec3(.64,.88,1.)*bright*(.65+.35*sin(t*.9+star*56.));
 vec2 star2=floor(v_uv*u_res.xy/9.0);float dust=step(.998,hash(star2+91.));col+=vec3(.21,.41,.57)*dust*.25;
 float atmos=exp(-pow((d-rad)/(.046*u_zoom),2.));col+=u_light*atmos*.12;
 if(d<rad){
  float r2=clamp(dot(p,p)/(rad*rad),0.,1.);
  vec3 normal=vec3(p/rad,sqrt(1.-r2));
  vec3 n=rotate(normal);
  float lo=terrain(n*1.7+vec3(u_seed*.6));
  float hi=terrain(n*5.1+vec3(u_seed*1.21));
  float land=smoothstep(.45,.57,lo+.05*sin(n.y*10.));
  vec3 ocean=u_main*.19+vec3(.006,.03,.07);
  vec3 ground=mix(u_main*.56+vec3(.12,.11,.08),u_light*.63,hi);
  vec3 surface=mix(ocean,ground,land);
  float latitude=abs(n.y);surface=mix(surface,vec3(.75,.89,.95),smoothstep(.75,.96,latitude)*.35);
  float clouds=smoothstep(.53,.65,noise(n*7.+vec3(t*.006,u_seed,0.)));
  surface=mix(surface,vec3(.68,.84,.92),clouds*.32);
  vec3 light=normalize(vec3(-.6,.6,.68));float dif=max(dot(normal,light),0.);
  float shade=.12+pow(dif,.9)*.88;
  float rim=pow(1.-normal.z,3.1);
  vec3 paint=surface*shade+u_light*rim*.35;
  float spec=pow(max(dot(reflect(-light,normal),vec3(0.,0.,1.)),0.),24.)*(1.-land)*.3;
  paint+=u_light*spec;
  if(u_scan>0.&&u_scan<1.){float rr=abs(d/rad-u_scan*1.55);paint+=u_light*exp(-rr*rr*1400.)*.8;}
  col=paint;
 }
 float edge=exp(-pow((d-rad)/.014,2.))*max(.0,1.-d/rad+.02);
 col+=u_light*edge*.08;
 // Warp streaks: transient visual effect with progress in [0..1].
 if(u_warp>0.){float angle=atan(uv.y,uv.x), rr=length(uv), seed=hash(vec2(floor(angle*68.),floor(angle*143.)));float ray=pow(max(0.,sin(angle*113.+seed*9.)),28.)*step(.3,seed);float stretch=smoothstep(.05,.8,rr);col+=u_light*ray*stretch*u_warp*.82;col+=u_light*u_warp*.055;}
 // Instrument scanlines, low opacity.
 col*=.976+.024*sin(gl_FragCoord.y*1.2);
 col=pow(col,vec3(.91));gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;
function shader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s)||'Shader compile failure');return s;}
function makeGL(canvas){const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!gl)return null;
 const vs=shader(gl,gl.VERTEX_SHADER,VS),fs=shader(gl,gl.FRAGMENT_SHADER,FS),prog=gl.createProgram();gl.attachShader(prog,vs);gl.attachShader(prog,fs);gl.linkProgram(prog);if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(prog)||'Shader link failure');gl.useProgram(prog);const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const apos=gl.getAttribLocation(prog,'a_pos');gl.vertexAttribPointer(apos,2,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(apos);
 const uniforms={};for(const key of ['res','time','rot','zoom','warp','scan','throttle','seed','main','light'])uniforms[key]=gl.getUniformLocation(prog,'u_'+key);
 return {gl,uniforms,prog,dispose(){gl.deleteBuffer(buf);gl.deleteProgram(prog);gl.deleteShader(vs);gl.deleteShader(fs)}};
}
function clamp(x,a,b){return Math.min(b,Math.max(a,x))}
export function initBridge(root,{reduced=false,onLaunch=()=>{}}={}){
 if(!root)return ()=>{};
 let canvas=root.querySelector('#bridge-gl');const hud=root.querySelector('#bridge-overlay'),ctx=hud.getContext('2d',{alpha:true});
 const title=root.querySelector('#bridge-sector-title'),sub=root.querySelector('#bridge-sector-sub'),co=root.querySelector('#bridge-coords'),feed=root.querySelector('#bridge-feed');
 const throttleInput=root.querySelector('#bridge-throttle'),throttleVal=root.querySelector('#bridge-throttle-value'),thrust=root.querySelector('#bridge-thrust'),bar=root.querySelector('#bridge-thrust-bar'),sensor=root.querySelector('#bridge-sensor'),sensorBar=root.querySelector('#bridge-sensor-bar');
 const log=root.querySelector('#bridge-log-line'),msg=root.querySelector('#bridge-message'),jumpCount=root.querySelector('#bridge-jumps'),discCount=root.querySelector('#bridge-discoveries'),warpButton=root.querySelector('#bridge-warp'),scanButton=root.querySelector('#bridge-scan'),soundButton=root.querySelector('#bridge-sound');
 const snapshot=load();let sectorIndex=snapshot.sector,targetIndex=sectorIndex,throttle=46,yaw=.2,pitch=-.06,zoom=1.0,dead=false,warpStart=0,scanStart=0,raf=0,last=0,networkTime=0,ac=null,sound=snapshot.sound,clean=[];
 const pointers=new Map();let pinchInitial=0,pinchZoom=1,dragging=false;
 let graphic=null;try{graphic=makeGL(canvas);}catch(e){console.warn('JARVIS Bridge: WebGL fallback',e)}
 if(!graphic&&!canvas.getContext('2d')){const alt=document.createElement('canvas');alt.id=canvas.id;alt.className=canvas.className;canvas.replaceWith(alt);canvas=alt;}
 const save=()=>{try{localStorage.setItem(LS_KEY,JSON.stringify({...snapshot,sector:sectorIndex,sound}))}catch{}};
 const clock=()=>new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 function speakSound(freq=440,duration=.12){if(!sound)return;try{ac=ac||new (window.AudioContext||window.webkitAudioContext)();if(ac.state==='suspended')ac.resume();const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.setValueAtTime(freq,ac.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq*.4),ac.currentTime+duration);gain.gain.setValueAtTime(.018,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+duration);osc.connect(gain).connect(ac.destination);osc.start();osc.stop(ac.currentTime+duration);}catch{}}
 function say(text){log.textContent=String(text);root.querySelector('#bridge-log-clock').textContent=clock();msg.textContent=String(text);msg.classList.add('visible');clearTimeout(say.timer);say.timer=setTimeout(()=>msg?.classList.remove('visible'),3200)}
 function updateSector(){const s=SECTORS[sectorIndex];title.textContent=s.name;sub.textContent=s.subtitle;co.textContent=s.coords;root.querySelectorAll('[data-sector]').forEach(b=>{const active=Number(b.dataset.sector)===targetIndex;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});}
 function updateControls(){throttleVal.textContent=throttle+'%';thrust.textContent=throttle+'%';bar.style.width=throttle+'%';root.querySelector('#bridge-reactor').textContent=(Math.max(35,99-Math.round(throttle*.18)))+'%';root.querySelector('#bridge-reactor-bar').style.width=(Math.max(35,99-Math.round(throttle*.18)))+'%';}
 const onThrottle=()=>{throttle=Number(throttleInput.value);updateControls();};throttleInput.addEventListener('input',onThrottle);clean.push(()=>throttleInput.removeEventListener('input',onThrottle));
 function choose(e){if(warpStart)return;targetIndex=Number(e.currentTarget.dataset.sector);updateSector();speakSound(380,.08);say(targetIndex===sectorIndex?'Выбран текущий сектор.':'Маршрут рассчитан: '+SECTORS[targetIndex].name+'. Для перехода установите тягу от 55%.');}
 root.querySelectorAll('[data-sector]').forEach(el=>{el.addEventListener('click',choose);clean.push(()=>el.removeEventListener('click',choose));});
 function onWarp(){if(warpStart||scanStart){say('Подождите завершения текущей операции.');return;}if(targetIndex===sectorIndex){say('Выберите другой сектор справа.');return;}if(throttle<55){say('Недостаточная тяга. Установите не менее 55%.');speakSound(170,.24);return;}warpStart=performance.now();feed.textContent='HYPERDRIVE / ACTIVE';warpButton.disabled=true;scanButton.disabled=true;root.classList.add('warping');say('Гипердвигатель активен. Переход в '+SECTORS[targetIndex].name+'.');speakSound(820,.8);}
 function onScan(){if(scanStart||warpStart)return;scanStart=performance.now();sensor.textContent='АНАЛИЗ';feed.textContent='PLANETARY SCAN / ACTIVE';scanButton.disabled=true;root.classList.add('scanning');say('Сканирование поверхности и атмосферы запущено…');speakSound(640,.45);}
 warpButton.addEventListener('click',onWarp);scanButton.addEventListener('click',onScan);clean.push(()=>warpButton.removeEventListener('click',onWarp),()=>scanButton.removeEventListener('click',onScan));
 function onSound(){sound=!sound;snapshot.sound=sound;save();soundButton.textContent=sound?'♫ ЗВУК ВКЛ':'♪ ЗВУК ВЫКЛ';speakSound(520,.08);}soundButton.addEventListener('click',onSound);clean.push(()=>soundButton.removeEventListener('click',onSound));
 const getDistance=()=>{const a=[...pointers.values()];return a.length<2?0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)};
 const onDown=e=>{if(e.pointerType==='mouse'&&e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragging=false;try{canvas.setPointerCapture(e.pointerId)}catch{}if(pointers.size===2){pinchInitial=getDistance();pinchZoom=zoom}};
 const onMove=e=>{if(!pointers.has(e.pointerId))return;const prev=pointers.get(e.pointerId),dx=e.clientX-prev.x,dy=e.clientY-prev.y;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.abs(dx)+Math.abs(dy)>2)dragging=true;if(pointers.size>=2&&pinchInitial){zoom=clamp(pinchZoom*getDistance()/pinchInitial,.72,1.25);}else if(!warpStart){yaw+=dx*.004;pitch=clamp(pitch+dy*.004,-1.3,1.3)}};
 const onUp=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinchInitial=0;};
 for(const [kind,fn] of [['pointerdown',onDown],['pointermove',onMove],['pointerup',onUp],['pointercancel',onUp]]){canvas.addEventListener(kind,fn);clean.push(()=>canvas.removeEventListener(kind,fn))}
 let contextLost=false;const lost=e=>{e.preventDefault();contextLost=true;feed.textContent='GRAPHICS PAUSED';};const restored=()=>{contextLost=false;try{graphic=makeGL(canvas)}catch(e){graphic=null}};
 canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);clean.push(()=>{canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored)});
 function drawFallback(w,h,t){const c=canvas.getContext('2d');if(!c)return;const dpr=Math.min(devicePixelRatio||1,1.4),W=Math.round(w*dpr),H=Math.round(h*dpr);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H}c.setTransform(dpr,0,0,dpr,0,0);c.fillStyle='#020914';c.fillRect(0,0,w,h);const s=SECTORS[sectorIndex],cx=w*.55,cy=h*.5,r=Math.min(w*.43,h*.40)*zoom;const g=c.createRadialGradient(cx-r*.3,cy-r*.37,r*.03,cx,cy,r);g.addColorStop(0,s.ambient);g.addColorStop(.5,'#163353');g.addColorStop(1,'#010712');c.fillStyle=g;c.shadowColor=s.ambient;c.shadowBlur=38;c.beginPath();c.arc(cx,cy,r,0,2*Math.PI);c.fill();c.shadowBlur=0;for(let i=0;i<155;i++){const x=((i*177.27)%w),y=((i*367.17)%h);c.fillStyle='rgba(200,230,255,.35)';c.fillRect(x,y,1,1)}}
 function drawHud(w,h,t,phase,scan){if(!ctx)return;const ratio=Math.min(devicePixelRatio||1,1.4),W=Math.round(w*ratio),H=Math.round(h*ratio);if(hud.width!==W||hud.height!==H){hud.width=W;hud.height=H}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
 const cx=w*.545,cy=h*.53,R=Math.min(w*.32,h*.43);ctx.save();ctx.strokeStyle='rgba(98,228,255,.21)';ctx.lineWidth=.9;ctx.setLineDash([3,9]);ctx.beginPath();ctx.ellipse(cx,cy,R*1.3,R*1.3,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(cx,cy,R*(1.16+i*.16),t*.05+i*1.3,t*.05+i*1.3+Math.PI*.35);ctx.strokeStyle=`rgba(94,214,255,${.13-i*.02})`;ctx.lineWidth=2;ctx.stroke()}
 ctx.strokeStyle='rgba(146,222,255,.53)';ctx.lineWidth=1.5;const gap=22,len=18;for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.beginPath();ctx.moveTo(cx+sx*gap,cy+sy*(gap+len));ctx.lineTo(cx+sx*gap,cy+sy*gap);ctx.lineTo(cx+sx*(gap+len),cy+sy*gap);ctx.stroke()}
 ctx.strokeStyle='rgba(113,218,251,.17)';ctx.beginPath();ctx.moveTo(cx-R*1.6,cy);ctx.lineTo(cx-R*.75,cy);ctx.moveTo(cx+R*.75,cy);ctx.lineTo(cx+R*1.6,cy);ctx.stroke();ctx.fillStyle='rgba(171,239,255,.62)';ctx.font='10px ui-monospace,monospace';ctx.fillText('VECTOR / '+Math.round(yaw*180/Math.PI)+'°',cx+30,cy+27);
 if(scan>0){ctx.strokeStyle=`rgba(96,244,237,${(1-scan)*.6})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R*(.3+scan*1.6),0,Math.PI*2);ctx.stroke()}
 if(phase>0){const intensity=Math.sin(Math.min(1,phase)*Math.PI);ctx.strokeStyle=`rgba(125,221,255,${intensity*.3})`;for(let i=0;i<50;i++){const a=i/50*2*Math.PI,r=R*(.4+((i*7)%10)*.13),len=R*(.25+phase*2);ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.lineTo(cx+Math.cos(a)*(r+len),cy+Math.sin(a)*(r+len));ctx.stroke()}}
 ctx.restore();}
 let fallbackCount=0;
 function frame(now){if(dead)return;raf=requestAnimationFrame(frame);if(document.hidden)return;if(now-last<(reduced?1000/12:1000/30))return;last=now;
 if(warpStart&&now-warpStart>2600){sectorIndex=targetIndex;warpStart=0;warpButton.disabled=false;scanButton.disabled=false;snapshot.sector=sectorIndex;snapshot.jumps++;save();root.classList.remove('warping');feed.textContent='ORBITAL LOCK / STABLE';updateSector();jumpCount.textContent='Переходов: '+snapshot.jumps;say('Переход завершён. Вы вышли на орбиту '+SECTORS[sectorIndex].name+'.');speakSound(610,.24)}
 if(scanStart&&now-scanStart>3300){scanStart=0;scanButton.disabled=false;root.classList.remove('scanning');sensor.textContent='ГОТОВ';sensorBar.style.width='100%';feed.textContent='SCAN COMPLETE / VERIFIED';const s=SECTORS[sectorIndex];snapshot.discoveries[s.id]=true;save();discCount.textContent='Открытий: '+Object.keys(snapshot.discoveries).length+'/4';say(s.discovery);speakSound(730,.16)}
 const wr=warpStart?clamp((now-warpStart)/2600,0,1):0,sc=scanStart?clamp((now-scanStart)/3300,0,1):0;
 sensorBar.style.width=scanStart?Math.round(sc*100)+'%':'100%';
 const bounds=canvas.getBoundingClientRect(),w=bounds.width,h=bounds.height;if(w<1||h<1)return;
 if(graphic&&!contextLost){const {gl,uniforms:u}=graphic;const scale=Math.min(window.devicePixelRatio||1,reduced?.65:.90),W=Math.max(1,Math.round(w*scale)),H=Math.max(1,Math.round(h*scale));if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;gl.viewport(0,0,W,H)}const s=SECTORS[sectorIndex];gl.useProgram(graphic.prog);gl.uniform2f(u.res,W,H);gl.uniform1f(u.time,now/1000);gl.uniform2f(u.rot,yaw,pitch);gl.uniform1f(u.zoom,zoom);gl.uniform1f(u.warp,wr?Math.sin(wr*Math.PI):0);gl.uniform1f(u.scan,sc);gl.uniform1f(u.throttle,throttle/100);gl.uniform1f(u.seed,s.seed);gl.uniform3fv(u.main,s.color);gl.uniform3fv(u.light,s.light);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}else{drawFallback(w,h,now);if(!fallbackCount++){feed.textContent='CANVAS MODE / WEBGL UNAVAILABLE';}}
 drawHud(w,h,now/1000,wr,sc);
 }
 updateControls();updateSector();root.querySelector('#bridge-log-clock').textContent=clock();raf=requestAnimationFrame(frame);
 const onVisibility=()=>{if(document.hidden){feed.textContent='PAUSED / BACKGROUND'}else if(!warpStart&&!scanStart){feed.textContent='ORBITAL LOCK / STABLE';last=0}};document.addEventListener('visibilitychange',onVisibility);clean.push(()=>document.removeEventListener('visibilitychange',onVisibility));
 return ()=>{dead=true;cancelAnimationFrame(raf);clearTimeout(say.timer);clean.forEach(fn=>fn());if(graphic)graphic.dispose();if(ac)ac.close().catch(()=>{})};
}
export const bridgeSectors=SECTORS.map(({id,name,subtitle})=>({id,name,subtitle}));
