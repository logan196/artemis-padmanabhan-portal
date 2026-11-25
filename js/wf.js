/* Artemis campaign-canvas workflow (from the Artemis portal runtime). */
(()=>{'use strict';const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const el=(t,a,p)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',t);for(const k in a)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e};
function initWorkflow(){const box=$('#wf');if(!box)return;const D=JSON.parse($('#wf-data').textContent);
 const world=$('.world',box),wires=$('svg.wires',box),panel=$('.panel',box);const CW=290,RH=170,NW=228;const pos={};let maxX=0,maxY=0;
 D.nodes.forEach(n=>{const x=n.col*CW+20,y=n.row*RH+20;pos[n.id]={x,y,n};const e=document.createElement('div');e.className='node'+(n.kind==='drop'?' drop':'');e.dataset.id=n.id;e.style.left=x+'px';e.style.top=y+'px';
  e.innerHTML=`<div class="hd">${n.logo?`<img src="assets/logos/${n.logo}" alt="${n.tool} logo" draggable="false">`:''}<div><div class="k">${n.tool}</div><b>${n.title}</b></div></div><p>${n.desc}</p>`;world.appendChild(e);pos[n.id].el=e});
 requestAnimationFrame(()=>{D.nodes.forEach(n=>{const p=pos[n.id];p.h=p.el.offsetHeight;maxX=Math.max(maxX,p.x+NW);maxY=Math.max(maxY,p.y+p.h)});drawWires();fit()});
 function drawWires(){wires.setAttribute('width',maxX+40);wires.setAttribute('height',maxY+40);wires.innerHTML='<defs><marker id="wfarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#98a2b3"/></marker></defs>';
  D.edges.forEach(([a,b,lab])=>{const A=pos[a],B=pos[b];let x1,y1,x2,y2,d;
   if(B.x>A.x+10){x1=A.x+NW;y1=A.y+A.h/2;x2=B.x;y2=B.y+B.h/2;const m=(x1+x2)/2;d=`M${x1},${y1}C${m},${y1} ${m},${y2} ${x2-2},${y2}`}
   else{x1=A.x+NW/2;y1=A.y+A.h;x2=B.x+NW/2;y2=B.y;const m=(y1+y2)/2;d=`M${x1},${y1}C${x1},${m} ${x2},${m} ${x2},${y2-2}`}
   const p=el('path',{d,fill:'none',stroke:'#98a2b3','stroke-width':1.8,'marker-end':'url(#wfarr)'},wires);if(B.n.kind==='drop')p.setAttribute('stroke-dasharray','5 4');
   if(lab){const tx=(x1+x2)/2,ty=(y1+y2)/2;const w=lab.length*6.4+14;el('rect',{x:tx-w/2,y:ty-10,width:w,height:20,rx:10,fill:'#fff',stroke:'#d0d5dd'},wires);const t=el('text',{x:tx,y:ty+4,'text-anchor':'middle','font-size':11,fill:'#475467','font-family':'Inter'},wires);t.textContent=lab}})}
 let v={x:0,y:0,s:1};const apply=()=>{world.style.transform=`translate(${v.x}px,${v.y}px) scale(${v.s})`;box.style.backgroundSize=`${22*v.s}px ${22*v.s}px`;box.style.backgroundPosition=`${v.x}px ${v.y}px`};
 function fit(){const W=box.clientWidth,H=box.clientHeight;const s=Math.min(1.1,Math.max(.3,Math.min((W-40)/(maxX+20),(H-40)/(maxY+20))));v={s,x:(W-(maxX+20)*s)/2,y:(H-(maxY+20)*s)/2};apply()}
 function zoomAt(f,cx,cy){const ns=Math.min(2.5,Math.max(.25,v.s*f));v.x=cx-(cx-v.x)*ns/v.s;v.y=cy-(cy-v.y)*ns/v.s;v.s=ns;apply()}
 $('.zin',box).onclick=()=>zoomAt(1.2,box.clientWidth/2,box.clientHeight/2);$('.zout',box).onclick=()=>zoomAt(1/1.2,box.clientWidth/2,box.clientHeight/2);$('.zreset',box).onclick=fit;
 box.addEventListener('wheel',e=>{if(e.target.closest('.panel'))return;e.preventDefault();const r=box.getBoundingClientRect();zoomAt(e.deltaY<0?1.1:1/1.1,e.clientX-r.left,e.clientY-r.top)},{passive:false});
 const pts=new Map();let moved=0,pinch=null;
 box.addEventListener('pointerdown',e=>{if(e.target.closest('.panel,.ctrl'))return;box.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});moved=0;box.classList.add('drag');
  if(pts.size===2){const [a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y)}}});
 box.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const p=pts.get(e.pointerId);const dx=e.clientX-p.x,dy=e.clientY-p.y;
  if(pts.size===2&&pinch){pts.set(e.pointerId,{x:e.clientX,y:e.clientY});const [a,b]=[...pts.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const r=box.getBoundingClientRect();zoomAt(d/pinch.d,(a.x+b.x)/2-r.left,(a.y+b.y)/2-r.top);pinch.d=d;moved+=10;return}
  moved+=Math.abs(dx)+Math.abs(dy);v.x+=dx;v.y+=dy;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});apply()});
 const up=e=>{if(!pts.has(e.pointerId))return;pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size)box.classList.remove('drag');
  if(moved<6&&e.type==='pointerup'){const t=document.elementFromPoint(e.clientX,e.clientY);const nd=t&&t.closest('.node');if(nd)open(nd.dataset.id)}};
 box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);
 function open(id){const n=pos[id].n;$$('.node',box).forEach(e=>e.classList.toggle('sel',e.dataset.id===id));
  const rows=(n.params||[]).map(([k,val])=>`<tr><td>${k}</td><td>${val}</td></tr>`).join('');
  panel.innerHTML=`<button class="x" aria-label="Close">&times;</button>${n.logo?`<img src="assets/logos/${n.logo}" alt="" style="width:44px;height:44px;object-fit:contain">`:''}<div class="k" style="font:600 10.5px var(--mono);letter-spacing:.1em;color:#667085;margin-top:8px">${n.tool}</div><h4>${n.title}</h4><p>${n.desc}</p>
   ${rows?`<h5>Parameters</h5><table>${rows}</table>`:''}<h5>Input</h5><p>${n.input||''}</p><h5>Output</h5><p>${n.output||''}</p>${n.link?`<a class="lk" href="${n.link}" target="_blank" rel="noopener">Open ${n.linkLabel||'docs'}</a>`:''}`;
  panel.classList.add('on');$('.x',panel).onclick=()=>{panel.classList.remove('on');$$('.node',box).forEach(e=>e.classList.remove('sel'))}}
 addEventListener('resize',()=>{fit()})}

let done=false;const go=()=>{if(done)return;done=true;initWorkflow()};
const box=document.getElementById('wf');if(!box)return;
if(document.readyState==='complete')go();else addEventListener('load',go);
})();
