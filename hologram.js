/** Independent 3D mathematical projection for JARVIS home screen.
 * No network, third-party dependencies or WebGL requirement. Renders a freely
 * rotatable, perspective-projected 3D wireframe orb and orbital paths on Canvas2D.
 */
const TAU=Math.PI*2;
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
export function initHologram(canvas,{reduced=false}={}){
 if(!canvas)return ()=>{};
 const ctx=canvas.getContext('2d',{alpha:true});
 if(!ctx)return ()=>{};
 let dead=false,raf=0,last=0,yaw=.34,pitch=-.29,dragging=false,dragged=false,px=0,py=0;
 const component=canvas.closest('.core-art');
 const preferReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||reduced;
 const getColor=()=>getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()||'#62dbff';
 const rotate=(x,y,z,spin)=>{
   const y1=y*Math.cos(pitch)-z*Math.sin(pitch),z1=y*Math.sin(pitch)+z*Math.cos(pitch);
   const x2=x*Math.cos(spin)+z1*Math.sin(spin),z2=z1*Math.cos(spin)-x*Math.sin(spin);
   return [x2,y1,z2];
 };
 const project=(a,spin,w,h,scale)=>{
   const [x,y,z]=rotate(a[0],a[1],a[2],spin);
   const k=3.2/(3.2-z*.45);
   return [w/2+x*k*scale,h/2+y*k*scale,k,z];
 };
 const strokePath=(vertices,spin,w,h,scale,alpha,lw,color)=>{
   ctx.beginPath();vertices.forEach((p,i)=>{const v=project(p,spin,w,h,scale);if(i===0)ctx.moveTo(v[0],v[1]);else ctx.lineTo(v[0],v[1]);});
   ctx.lineWidth=lw;ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.stroke();
 };
 const circlePoints=(radius,plane,offset=0)=>{
   const pts=[];for(let i=0;i<=128;i++){const a=i/128*TAU+offset;
     if(plane===0)pts.push([radius*Math.cos(a),radius*Math.sin(a),0]);
     else if(plane===1)pts.push([radius*Math.cos(a),0,radius*Math.sin(a)]);
     else pts.push([0,radius*Math.cos(a),radius*Math.sin(a)]);
   }return pts;
 };
 const ringSet=[circlePoints(.94,0),circlePoints(.94,1),circlePoints(.94,2),circlePoints(.76,0),circlePoints(.62,1),circlePoints(1.21,0),circlePoints(1.15,1)];
 function frame(now){
   if(dead)return;
   raf=requestAnimationFrame(frame);
   if(document.hidden||now-last<1000/(preferReduced?2:28))return;
   const dt=last?(now-last)/1000:0;last=now;
   if(!dragging&&!preferReduced)yaw+=dt*.10;
   const rect=canvas.getBoundingClientRect();const w=Math.max(1,rect.width),h=Math.max(1,rect.height);
   const dpr=Math.min(2,window.devicePixelRatio||1);
   if(canvas.width!==Math.floor(w*dpr)||canvas.height!==Math.floor(h*dpr)){canvas.width=Math.floor(w*dpr);canvas.height=Math.floor(h*dpr);}
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
   const base=Math.min(w,h)*.34;
   const accent=getColor();
   // Radiant central field
   const g=ctx.createRadialGradient(w/2,h/2,1,w/2,h/2,base*1.5);
   g.addColorStop(0,'rgba(33,160,236,.14)');g.addColorStop(.52,'rgba(19,108,177,.07)');g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(w/2,h/2,base*1.6,0,TAU);ctx.fill();
   ringSet.forEach((ring,i)=>strokePath(ring,yaw+(i%3)*.2,w,h,base,i>4?.22:.43,i>4?.75:1.0,accent));
   // Dynamic rotating orbital ribbons, using actual 3D coordinates
   for(let ringIndex=0;ringIndex<3;ringIndex++){
     const pts=[];const count=55;
     for(let i=0;i<=count;i++){
       const a=(i/count*.83+now*.000042*(ringIndex%2?1:-1)+ringIndex*.26)*TAU;
       const r=1.03+ringIndex*.085;
       if(ringIndex===0)pts.push([r*Math.cos(a),r*Math.sin(a)*.56,r*Math.sin(a)*.65]);
       else if(ringIndex===1)pts.push([r*Math.sin(a)*.52,r*Math.cos(a),r*Math.sin(a)*.82]);
       else pts.push([r*Math.cos(a),r*Math.sin(a)*.84,r*Math.sin(a)*.32]);
     }
     ctx.shadowColor=accent;ctx.shadowBlur=5;
     strokePath(pts,yaw,w,h,base,.61,1.4,accent);ctx.shadowBlur=0;
   }
   // Latitude guides and longitudinal traces on the central globe
   for(let lat=-2;lat<=2;lat++){
     const y=lat*.18,r=Math.sqrt(1-y*y)*.72,pts=[];
     for(let i=0;i<=48;i++){const a=i/48*TAU;pts.push([r*Math.cos(a),y,r*Math.sin(a)]);}
     strokePath(pts,yaw,w,h,base,.16,.6,accent);
   }
   for(let lon=0;lon<8;lon++){
     const a=lon/8*TAU,pts=[];
     for(let i=0;i<=40;i++){const b=i/40*TAU;pts.push([.7*Math.sin(b)*Math.cos(a),.7*Math.cos(b),.7*Math.sin(b)*Math.sin(a)]);}
     strokePath(pts,yaw,w,h,base,.12,.55,accent);
   }
   for(let i=0;i<11;i++){
     const ang=(i*2.39996+now*.00011*(i%2?1:-1));
     const xyz=[Math.cos(ang)*(.9+.05*(i%3)),Math.sin(ang*1.32)*.74,Math.sin(ang)*.62];
     const [x,y,k,z]=project(xyz,yaw,w,h,base);
     ctx.fillStyle=accent;ctx.globalAlpha=z>0?.89:.34;ctx.beginPath();ctx.arc(x,y,z>0?2.2:1.15,0,TAU);ctx.fill();
   }
   ctx.globalAlpha=1;
 }
 function onDown(e){
   if(e.pointerType==='mouse'&&e.button!==0)return;
   px=e.clientX;py=e.clientY;dragging=true;dragged=false;
   try{component?.setPointerCapture(e.pointerId);}catch{}
 }
 function onMove(e){
   if(!dragging)return;
   const dx=e.clientX-px,dy=e.clientY-py;
   if(Math.abs(dx)+Math.abs(dy)>2){dragged=true;}
   yaw+=dx*.012;pitch=clamp(pitch+dy*.010,-1.1,1.1);
   px=e.clientX;py=e.clientY;
 }
 function onEnd(){dragging=false;}
 function onClick(e){if(dragged){e.stopImmediatePropagation();e.preventDefault();dragged=false;}}
 component?.addEventListener('pointerdown',onDown);
 component?.addEventListener('pointermove',onMove);
 component?.addEventListener('pointerup',onEnd);
 component?.addEventListener('pointercancel',onEnd);
 component?.addEventListener('click',onClick,true);
 raf=requestAnimationFrame(frame);
 return ()=>{dead=true;cancelAnimationFrame(raf);component?.removeEventListener('pointerdown',onDown);component?.removeEventListener('pointermove',onMove);component?.removeEventListener('pointerup',onEnd);component?.removeEventListener('pointercancel',onEnd);component?.removeEventListener('click',onClick,true);};
}
