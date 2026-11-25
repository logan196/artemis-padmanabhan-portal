/* Landing walk-through. Values are the v3 public-data results (decoupleR footprints, Hedges g). */
(function(){"use strict";
var D=document, RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var ROWS=[['Adult mouse heart, sham',9.03,-0.38],['Human iPSC-CM + ET-1',30.11,-0.44],['Mouse TAC day 3',7.96,0.49],['Mouse TAC day 11',5.10,1.65],['Mouse TAC day 28',6.19,-0.37],['Rat NRVM + PE, 90 min',13.18,-1.43],['Rat NRVM + PE, 6 h',25.33,0.97],['Rat NRVM + PE, 48 h',16.79,-3.41]];
function svgAxis(fig){
  var narrow=fig.clientWidth<520, W=narrow?360:470, L=narrow?14:172, R=W-(narrow?40:46), top=narrow?24:26, rh=narrow?50:36, H=top+ROWS.length*rh+30, lo=-5, hi=32, fs=narrow?13:12.5;
  function X(g){return L+(g-lo)/(hi-lo)*(R-L);}
  var s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="BD1 and BD2 footprint per heart comparison">';
  [0,10,20,30].forEach(function(t){s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(top-8)+'" y2="'+(H-24)+'" stroke="'+(t?'#efeadf':'#9aa4ab')+'" stroke-width="1"/><text x="'+X(t)+'" y="'+(H-8)+'" text-anchor="middle" font-size="11" fill="#6b665c">'+t+'</text>';});
  s+='<text x="'+(narrow?L:L)+'" y="12" font-size="11" fill="#6b665c">Hedges g, JQ1 vs vehicle</text>';
  ROWS.forEach(function(r,i){var y=top+i*rh, by=narrow?y+18:y;
    s+=narrow?'<text x="'+L+'" y="'+(y+12)+'" font-size="'+fs+'" fill="#1c1a15" stroke="#fff" stroke-width="5" paint-order="stroke">'+r[0]+'</text>':'<text x="'+(L-10)+'" y="'+(y+14)+'" text-anchor="end" font-size="'+fs+'" fill="#1c1a15">'+r[0]+'</text>';
    [[r[1],'#0072B2',by+2],[r[2],'#E69F00',by+16]].forEach(function(b){var x0=X(0), x1=X(b[0]), xa=Math.min(x0,x1), w=Math.abs(x1-x0), on=fig.classList.contains('on');
      s+='<rect class="wb" data-x="'+xa.toFixed(1)+'" data-w="'+w.toFixed(1)+'" x="'+(on?xa:x0).toFixed(1)+'" y="'+b[2]+'" width="'+(on?w:0).toFixed(1)+'" height="11" rx="2" fill="'+b[1]+'"/>';
      s+='<text class="wv" x="'+(Math.max(x0,x1)+5).toFixed(1)+'" y="'+(b[2]+9.5)+'" font-size="10.5" fill="#33424a">'+(b[0]>0?'+':'')+b[0].toFixed(1)+'</text>';});});
  s+='</svg>'; fig.querySelector('.wsvg').innerHTML=s; fig._narrow=narrow;
}
function grow(fig){ if(fig.classList.contains('on')) return; fig.classList.add('on');
  [].forEach.call(fig.querySelectorAll('.wb'),function(r,i){var go=function(){r.setAttribute('x',r.getAttribute('data-x'));r.setAttribute('width',r.getAttribute('data-w'));};
    if(RM) go(); else setTimeout(go,120+Math.floor(i/2)*90);});}
function stepper(box){
  var li=[].slice.call(box.querySelectorAll('li')), bar=box.querySelector('.wprog i'), btn=box.querySelector('.wpause'), cur=0, t0=0, dur=5200, paused=RM, vis=false, raf=0, hover=false;
  function set(i){cur=(i+li.length)%li.length; li.forEach(function(e,k){e.classList.toggle('on',k===cur);e.setAttribute('aria-current',k===cur?'step':'false');}); t0=performance.now(); if(bar) bar.style.width='0';}
  function tick(now){ if(!paused&&vis&&!hover){var k=(now-t0)/dur; if(bar) bar.style.width=Math.min(100,k*100)+'%'; if(k>=1) set(cur+1);} else t0=now-(parseFloat(bar&&bar.style.width||0)/100)*dur; raf=requestAnimationFrame(tick);}
  li.forEach(function(e,k){e.addEventListener('click',function(ev){if(ev.target.closest('a')) return; set(k);}); e.tabIndex=0; e.addEventListener('keydown',function(ev){if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();set(k);}});});
  box.addEventListener('mouseenter',function(){hover=true;}); box.addEventListener('mouseleave',function(){hover=false;});
  box.addEventListener('focusin',function(){hover=true;}); box.addEventListener('focusout',function(){hover=false;});
  if(btn){btn.textContent=paused?'Play':'Pause'; btn.onclick=function(){paused=!paused;btn.textContent=paused?'Play':'Pause';};}
  set(0);
  if(RM){ if(bar) bar.parentNode.style.display='none'; }
  raf=requestAnimationFrame(tick);
  return function(v){vis=v;};
}
function init(){ var sec=D.getElementById('walk'); if(!sec) return; var fig=sec.querySelector('.waxis'); svgAxis(fig); var rt=null; window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){ if((fig.clientWidth<520)!==fig._narrow) svgAxis(fig);},200);});
  var setVis=stepper(sec.querySelector('.wsteps'));
  if(!('IntersectionObserver' in window)){grow(fig);setVis(true);return;}
  new IntersectionObserver(function(en){en.forEach(function(e){ if(e.target===fig&&e.isIntersecting) grow(fig); if(e.target===sec) setVis(e.isIntersecting);});},{threshold:0.25}).observe(fig);
  new IntersectionObserver(function(en){en.forEach(function(e){setVis(e.isIntersecting);});},{threshold:0.2}).observe(sec);
}
/* Keep the floating 'Ask the data' button off the walk-through and the interactive figures. */
function fab(){ if(!('IntersectionObserver' in window)) return; var n=0, seen=new Set();
  var io=new IntersectionObserver(function(en){en.forEach(function(e){ if(e.isIntersecting) seen.add(e.target); else seen.delete(e.target);}); D.body.classList.toggle('fab-off',seen.size>0);},{threshold:0});
  [].forEach.call(D.querySelectorAll('#walk .wgrid, .ix'),function(e){io.observe(e);}); }
if(D.readyState==='loading') D.addEventListener('DOMContentLoaded',function(){init();fab();}); else {init();fab();}
})();
