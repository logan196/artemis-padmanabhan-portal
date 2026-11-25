/* Artemis Biolabs interactive gene figures. Public data only. Plotly.js and data load lazily per figure. */
(function(){
"use strict";
var BASE='interactive/', PLOTLY=BASE+'plotly.min.js';
var C={bd1:'#0072B2',bd2:'#E69F00',both:'#4D4D4D',bg:'#BDBDBD',prog:'#009E73',omito:'#56B4E9',act:'#D55E00',rep:'#56B4E9',top:'#D55E00',ink:'#1c1a15',teal:'#0E5E66'};
var FONT='Inter, system-ui, Arial, sans-serif';
var plotlyP=null;
function loadPlotly(){ if(window.Plotly) return Promise.resolve(); if(plotlyP) return plotlyP;
  plotlyP=new Promise(function(res,rej){var s=document.createElement('script');s.src=PLOTLY;s.async=true;s.onload=res;s.onerror=rej;document.head.appendChild(s);}); return plotlyP; }
function getJSON(u){return fetch(u).then(function(r){if(!r.ok) throw new Error(u+' '+r.status); return r.json();});}
function mobile(){return window.innerWidth<640;}
function fp(p){ if(p===null||p===undefined||isNaN(p)) return 'NA'; if(p===0) return '<1e-300'; return p<0.001? p.toExponential(1):(p<0.1?String(Number(p.toPrecision(2))):p.toFixed(2)); }
function f2(x){return (x===null||x===undefined)?'NA':(x>0?'+':'')+x.toFixed(2);}
function f3(x){return (x===null||x===undefined)?'NA':x.toFixed(3);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function pill(h){return '<span class="pill">'+h+'</span>';}
function nlp2p(y){return Math.pow(10,-y);}
function baseLayout(xt,yt,xs){ var m=mobile(); if(m&&xs) xt=xs; return {font:{family:FONT,size:m?11:12,color:'#33424a'},paper_bgcolor:'#fff',plot_bgcolor:'#fff',showlegend:false,
  margin:{l:m?52:64,r:m?10:18,t:10,b:m?48:56},hovermode:'closest',dragmode:'zoom',
  hoverlabel:{bgcolor:'#fff',bordercolor:'#c9c3b5',font:{family:FONT,size:12,color:'#1c1a15'},align:'left'},
  xaxis:{title:{text:xt,standoff:8},zeroline:true,zerolinecolor:'#9aa4ab',gridcolor:'#f0ede6',automargin:true,ticks:'outside',ticklen:4},
  yaxis:{title:{text:yt,standoff:8},zeroline:false,gridcolor:'#f0ede6',automargin:true,ticks:'outside',ticklen:4}}; }
var CFG={responsive:true,displayModeBar:false,scrollZoom:false};
/* Greedy, collision-free label placement in pixel space. */
function placeLabels(gd,cands,maxN){
  var fl=gd._fullLayout; if(!fl||!fl.xaxis) return [];
  var xa=fl.xaxis, ya=fl.yaxis, x0=xa._offset, x1=xa._offset+xa._length, y0=ya._offset, y1=ya._offset+ya._length;
  var fs=mobile()?10:11, boxes=[], out=[], n=0; var cv=placeLabels._c||(placeLabels._c=document.createElement('canvas').getContext('2d')); cv.font='600 '+fs+'px '+FONT;
  var pts=cands.map(function(c){return {c:c,px:x0+xa.l2p(xa.d2l(c.x)),py:y0+ya.l2p(ya.d2l(c.y))};})
    .filter(function(p){return isFinite(p.px)&&isFinite(p.py)&&p.px>=x0&&p.px<=x1&&p.py>=y0&&p.py<=y1;});
  pts.forEach(function(p){boxes.push([p.px-4,p.py-4,p.px+4,p.py+4]);});
  function hit(b){for(var i=0;i<boxes.length;i++){var o=boxes[i]; if(b[0]<o[2]&&b[2]>o[0]&&b[1]<o[3]&&b[3]>o[1]) return true;} return false;}
  var offs=[[22,-20],[-22,-20],[22,20],[-22,20],[34,0],[-34,0],[0,-28],[0,28],[40,-34],[-40,-34],[40,34],[-40,34]];
  for(var k=0;k<pts.length&&n<maxN;k++){var p=pts[k], w=cv.measureText(p.c.text).width+12, h=fs+10, ok=false;
    for(var j=0;j<offs.length;j++){var ax=offs[j][0], ay=offs[j][1];
      var cx=p.px+ax+(ax>0?w/2:ax<0?-w/2:0), cy=p.py+ay, b=[cx-w/2,cy-h/2,cx+w/2,cy+h/2];
      if(b[0]<x0+2||b[2]>x1-2||b[1]<y0+2||b[3]>y1-2) continue;
      if(hit(b)) continue;
      boxes.push(b); out.push({x:p.c.x,y:p.c.y,text:p.c.forced?'<b>'+esc(p.c.text)+'</b>':esc(p.c.text),showarrow:true,arrowhead:0,arrowwidth:0.8,arrowcolor:'#6b665c',
        ax:ax+(ax>0?w/2-4:ax<0?-w/2+4:0),ay:ay,font:{family:FONT,size:fs,color:p.c.forced?'#000':'#1c1a15'},bgcolor:'rgba(255,255,255,0.85)',borderpad:1,xanchor:'center',yanchor:'middle'});
      ok=true; n++; break; }
  }
  return out;
}
function bindLabels(gd,getCands){
  var busy=false;
  function domFix(a,tries){ var g=[].slice.call(gd.querySelectorAll('g.annotation-text-g')); if(g.length!==a.length||tries>4) return Promise.resolve();
    var r=g.map(function(e){var b=e.getBoundingClientRect();return [b.left-1,b.top-1,b.right+1,b.bottom+1];}), drop=-1;
    for(var i=0;i<r.length&&drop<0;i++) for(var j=0;j<i;j++){ if(r[i][0]<r[j][2]&&r[i][2]>r[j][0]&&r[i][1]<r[j][3]&&r[i][3]>r[j][1]){drop=i;break;} }
    if(drop<0) return Promise.resolve(); a.splice(drop,1); return Plotly.relayout(gd,{annotations:a}).then(function(){return domFix(a,tries+1);}); }
  function run(){ if(busy) return; busy=true; var c=getCands(); var a=placeLabels(gd,c.list,c.max);
    Plotly.relayout(gd,{annotations:a}).then(function(){return domFix(a,0);}).then(function(){busy=false;},function(){busy=false;}); }
  var bound=false;
  function bind(){ if(bound||!gd.on) return; bound=true;
    gd.on('plotly_relayout',function(ev){ if(busy) return; var k=Object.keys(ev||{}); if(!k.length||k.every(function(x){return x.indexOf('annotations')===0;})) return; setTimeout(run,0); });
    var t=null; window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(run,250);}); }
  return function(){bind();run();};
}
/* Sortable, paged, downloadable table. */
function Table(el,cols,name){
  this.el=el; this.cols=cols; this.name=name; this.rows=[]; this.sortK=null; this.dir=-1; this.limit=15; this.hl=null;
  el.innerHTML='<div class="bar"><span class="cnt"></span><span class="sp"></span><button class="sbtn csv" type="button">Download CSV (this view)</button><button class="sbtn csvall" type="button">Download CSV (all)</button></div><div class="wrapt"><table><thead></thead><tbody></tbody></table></div><div class="more"></div>';
  var self=this; el.querySelector('.csv').onclick=function(){self.csv(self.sorted(),name);};
  el.querySelector('.csvall').onclick=function(){ if(self.allFn) self.csv(self.allFn(),name+'_all'); };
}
Table.prototype.set=function(rows,hl,sortK,extra){ if(hl&&extra&&!rows.some(function(r){return r.gene===hl;})){var e=extra.filter(function(r){return r.gene===hl;}); rows=e.concat(rows);} this.rows=rows;this.hl=hl||null;if(sortK!==undefined){this.sortK=sortK;this.dir=1;}this.limit=15;this.draw();};
Table.prototype.sorted=function(){var k=this.sortK,d=this.dir,c=this.cols.filter(function(x){return x.k===k;})[0]; if(!c) return this.rows.slice();
  return this.rows.slice().sort(function(a,b){var x=a[k],y=b[k]; if(x===null||x===undefined) return 1; if(y===null||y===undefined) return -1; if(c.abs){x=Math.abs(x);y=Math.abs(y);} return (x<y?-1:x>y?1:0)*d;});};
Table.prototype.draw=function(){var self=this, rs=this.sorted();
  if(this.hl){var i=rs.findIndex(function(r){return r.gene===self.hl;}); if(i>0){rs.unshift(rs.splice(i,1)[0]);}}
  var th=this.cols.map(function(c){return '<th data-k="'+c.k+'"'+(c.k===self.sortK?' aria-sort="'+(self.dir>0?'ascending':'descending')+'"':'')+'>'+c.label+'</th>';}).join('');
  this.el.querySelector('thead').innerHTML='<tr>'+th+'</tr>';
  this.el.querySelectorAll('th').forEach(function(t){t.onclick=function(){var k=t.getAttribute('data-k'); if(self.sortK===k) self.dir=-self.dir; else {self.sortK=k;self.dir=1;} self.draw();};});
  var show=rs.slice(0,this.limit);
  this.el.querySelector('tbody').innerHTML=show.map(function(r){return '<tr'+(r.gene===self.hl?' class="hl"':'')+'>'+self.cols.map(function(c){var v=r[c.k], cl='';
    if(c.sig&&v!==null&&r[c.sig]!==null&&r[c.sig]<0.05) cl=v<0?' class="dn"':' class="up"';
    return '<td'+cl+'>'+(c.fmt?c.fmt(v):esc(v===null||v===undefined?'NA':v))+'</td>';}).join('')+'</tr>';}).join('');
  this.el.querySelector('.cnt').textContent=rs.length.toLocaleString()+' rows'+(rs.length>show.length?', showing '+show.length:'');
  var m=this.el.querySelector('.more'); m.innerHTML='';
  if(rs.length>show.length){var b=document.createElement('button');b.className='sbtn';b.type='button';b.textContent='Show 25 more';b.onclick=function(){self.limit+=25;self.draw();};m.appendChild(b);}
};
Table.prototype.csv=function(rs,name){var cols=this.cols, l=[cols.map(function(c){return c.label;}).join(',')];
  rs.forEach(function(r){l.push(cols.map(function(c){var v=r[c.k]; v=(v===null||v===undefined)?'':String(v); return /[",]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(','));});
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([l.join('\n')],{type:'text/csv'})); a.download=name+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);};
function q(el,s){return el.querySelector(s);}
function compOpts(comps){return comps.map(function(c){return '<option value="'+c.id+'">'+esc(c.label)+'</option>';}).join('');}
function studyLine(c){return esc(c.study)+', '+c.geo+', '+esc(c.method);}
function searchBind(el,fn){var inp=q(el,'.gq'), msg=q(el,'.msg'); function go(){var g=inp.value.trim().toUpperCase(); var r=fn(g||null); msg.textContent=g?(r?'':'"'+g+'" is not in this view'):'';}
  q(el,'.gbtn2').onclick=go; inp.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();go();}});
  q(el,'.png').onclick=function(){Plotly.downloadImage(q(el,'.ixplot'),{format:'png',scale:3,filename:el.id});};}
function ring(x,y,txt){return {type:'scatter',mode:'markers',x:[x],y:[y],hoverinfo:'skip',marker:{size:15,color:'rgba(0,0,0,0)',line:{color:'#000',width:2}},text:[txt]};}
function scat(x,y,cd,color,size,op,ht,gl){return {type:gl?'scattergl':'scatter',mode:'markers',x:x,y:y,customdata:cd,marker:{color:color,size:size,opacity:op,line:{width:0}},hovertemplate:ht};}
/* ---------------- F1: BD1 versus BD2 ---------------- */
function f1(el,D){
  var comp=D.comps[0].id, ref='BD1', hl=null, plot=q(el,'.ixplot');
  q(el,'.csel').innerHTML=compOpts(D.comps);
  var CL=['Other genes','BD1-selective','BD2-selective','BD1 and BD2'], CC=[C.bg,C.bd1,C.bd2,C.both];
  var tbl=new Table(q(el,'.ixtbl'),[{k:'gene',label:'Gene'},{k:'cls',label:'Gilan class'},{k:'lfc',label:'Heart log2FC',fmt:f2,sig:'padj',abs:true},{k:'padj',label:'Adjusted p',fmt:fp},{k:'bd1',label:'BD1 ref log2FC',fmt:f2},{k:'bd2',label:'BD2 ref log2FC',fmt:f2},{k:'model',label:'Comparison'},{k:'study',label:'Study'}],'BD1_BD2_genes');
  function rows(c,all){var cm=D.comps.filter(function(x){return x.id===c;})[0]; return D.d[c].filter(function(r){return all||D.cls[r[0]]>0;}).map(function(r){var i=r[0];return {gene:D.genes[i],cls:CL[D.cls[i]],lfc:r[1],padj:r[2],bd1:D.bd1[i],bd2:D.bd2[i],model:cm.label,study:cm.geo};});}
  tbl.allFn=function(){var o=[];D.comps.forEach(function(c){o=o.concat(rows(c.id,false));});return o;};
  function draw(){
    var cm=D.comps.filter(function(x){return x.id===comp;})[0], R=D.d[comp], rf=ref==='BD1'?D.bd1:D.bd2, tr=[];
    [0,1,3,2].forEach(function(k){var x=[],y=[],cd=[]; R.forEach(function(r){if(D.cls[r[0]]===k){x.push(rf[r[0]]);y.push(r[1]);cd.push([D.genes[r[0]],fp(r[2]),f2(D.bd1[r[0]]),f2(D.bd2[r[0]]),CL[k]]);}});
      tr.push(scat(x,y,cd,CC[k],k?6:4,k?0.85:0.35,'<b>%{customdata[0]}</b> (%{customdata[4]})<br>Heart log2FC %{y:.2f}, adj. p %{customdata[1]}<br>Gilan BD1 %{customdata[2]}, BD2 %{customdata[3]}<br>'+esc(cm.label)+'<br>'+studyLine(cm)+'<extra></extra>',true));});
    var cands=R.filter(function(r){return D.cls[r[0]]>0&&r[2]<0.05;}).sort(function(a,b){return Math.abs(b[1])-Math.abs(a[1]);}).slice(0,40).map(function(r){return {x:rf[r[0]],y:r[1],text:D.genes[r[0]]};});
    var found=null; if(hl){var h=R.filter(function(r){return D.genes[r[0]]===hl;})[0]; if(h){found=h; tr.push(ring(rf[h[0]],h[1],hl)); cands.unshift({x:rf[h[0]],y:h[1],text:hl,forced:true});}}
    var lay=baseLayout('Reference log2FC with the '+(ref==='BD1'?'BD1':'BD2')+'-selective inhibitor (Gilan et al. 2020)','Heart log2FC, JQ1 vs vehicle',ref+' reference log2FC');
    lay.xaxis.zeroline=true; lay.yaxis.zeroline=true; lay.yaxis.zerolinecolor='#9aa4ab';
    var rh=D.rho[comp], sc=D.score;
    q(el,'.ixstats').innerHTML=pill('Spearman rho with BD1 <b>'+rh.bd1.toFixed(2)+'</b>, with BD2 <b>'+rh.bd2.toFixed(2)+'</b> ('+rh.n.toLocaleString()+' genes)')+
      pill('BD1 minus BD2 <b>'+f3(rh.diff)+'</b>, 95% CI '+f3(rh.lo)+' to '+f3(rh.hi))+
      pill('decoupleR footprint: BD1 g <b>'+f2(sc.BD1[comp].g)+'</b> (p '+fp(sc.BD1[comp].p)+'), BD2 g <b>'+f2(sc.BD2[comp].g)+'</b> (p '+fp(sc.BD2[comp].p)+')')+pill(studyLine(cm));
    return Plotly.react(plot,tr,lay,CFG).then(function(){ el._cands={list:cands,max:mobile()?4:8}; el._label(); tbl.set(rows(comp,false),hl,el._sorted?undefined:'padj',hl?rows(comp,true):null); el._sorted=1; return !!found;});
  }
  el._label=bindLabels(plot,function(){return el._cands||{list:[],max:0};});
  q(el,'.csel').onchange=function(){comp=this.value;draw();};
  el.querySelectorAll('.seg button').forEach(function(b){b.onclick=function(){el.querySelectorAll('.seg button').forEach(function(x){x.classList.remove('on');});b.classList.add('on');ref=b.getAttribute('data-v');draw();};});
  searchBind(el,function(g){hl=g; return draw();});
  return draw();
}
/* ---------------- F2: GATA4 target volcano ---------------- */
function volcano(el,opt){
  var plot=q(el,'.ixplot'), hl=null, key=opt.keys[0], filt=opt.filters[0][0];
  if(q(el,'.csel')) {q(el,'.csel').innerHTML=opt.keyOpts; q(el,'.csel').onchange=function(){key=this.value;draw();};}
  var fs=q(el,'.fsel'); fs.innerHTML=opt.filters.map(function(f){return '<option value="'+f[0]+'">'+f[1]+'</option>';}).join(''); fs.onchange=function(){filt=this.value;draw();};
  var tbl=new Table(q(el,'.ixtbl'),opt.cols,opt.name); tbl.allFn=opt.allRows;
  function draw(){
    var P=opt.points(key), tr=[];
    opt.groups.forEach(function(g){var x=[],y=[],cd=[]; P.forEach(function(p){if(p.grp===g.k){x.push(p.x);y.push(p.y);cd.push(p.cd);}});
      tr.push(scat(x,y,cd,g.color,g.size,g.op,opt.hover(key),true));});
    var cands=P.filter(function(p){return p.grp!==opt.groups[0].k&&p.sig;}).sort(function(a,b){return b.y-a.y;}).slice(0,40).map(function(p){return {x:p.x,y:p.y,text:p.gene};});
    var found=null; if(hl){found=P.filter(function(p){return p.gene===hl;})[0]; if(found){tr.push(ring(found.x,found.y,hl)); cands.unshift({x:found.x,y:found.y,text:hl,forced:true});}}
    var lay=baseLayout(opt.xt,opt.yt,opt.xs); var ymax=Math.max.apply(null,P.map(function(p){return p.y;}).concat([3]));
    lay.yaxis.range=[0,ymax*1.08]; lay.shapes=[{type:'line',xref:'paper',x0:0,x1:1,y0:-Math.log10(0.05),y1:-Math.log10(0.05),line:{color:'#8a8478',width:1,dash:'dash'}}];
    if(opt.extraLayout) opt.extraLayout(lay,key);
    q(el,'.ixstats').innerHTML=opt.stats(key);
    return Plotly.react(plot,tr,lay,CFG).then(function(){el._cands={list:cands,max:mobile()?5:10}; el._label(); tbl.set(opt.rows(key,filt),hl,el._sorted?undefined:opt.sortK,hl?opt.rows(key,'all'):null); el._sorted=1; return !!found;});
  }
  el._label=bindLabels(plot,function(){return el._cands||{list:[],max:0};});
  searchBind(el,function(g){hl=g;return draw();});
  return draw();
}
function f2fig(el,D){
  var byId={}; D.comps.forEach(function(c){byId[c.id]=c;});
  var mode=function(g){return D.gata4[g]||null;};
  function rows(c,f){var cm=byId[c]; return D.d[c].filter(function(r){return f==='all'||mode(D.genes[r[0]]);}).map(function(r){var g=D.genes[r[0]];return {gene:g,mode:mode(g)?'GATA4 target, '+mode(g):'not a GATA4 target',lfc:r[1],padj:nlp2p(r[2]),model:cm.label,study:cm.geo};});}
  return volcano(el,{keys:D.comps.map(function(c){return c.id;}),keyOpts:compOpts(D.comps),name:'GATA4_targets',sortK:'padj',
    filters:[['t','GATA4 targets (CollecTRI)'],['all','All genes']],
    cols:[{k:'gene',label:'Gene'},{k:'mode',label:'GATA4 mode'},{k:'lfc',label:'log2FC',fmt:f2,sig:'padj',abs:true},{k:'padj',label:'Adjusted p',fmt:fp},{k:'model',label:'Comparison'},{k:'study',label:'Study'}],
    rows:rows, allRows:function(){var o=[];D.comps.forEach(function(c){o=o.concat(rows(c.id,'t'));});return o;},
    groups:[{k:0,color:C.bg,size:4,op:0.35},{k:2,color:C.rep,size:7,op:0.9},{k:1,color:C.act,size:7,op:0.9}],
    points:function(c){return D.d[c].map(function(r){var g=D.genes[r[0]],m=mode(g);return {gene:g,x:r[1],y:r[2],sig:r[2]>-Math.log10(0.05),grp:m==='activated'?1:m==='repressed'?2:0,cd:[g,fp(nlp2p(r[2])),m?'GATA4 target ('+m+')':'not a GATA4 target']};});},
    hover:function(c){var cm=byId[c];return '<b>%{customdata[0]}</b>, %{customdata[2]}<br>log2FC %{x:.2f}, adj. p %{customdata[1]}<br>'+esc(cm.label)+'<br>'+studyLine(cm)+'<extra></extra>';},
    xt:'log2FC, JQ1 vs vehicle',yt:'-log10 adjusted p',
    stats:function(c){var s=D.score[c], R=D.d[c].filter(function(r){return mode(D.genes[r[0]]);}), dn=R.filter(function(r){return r[2]>1.301&&r[1]<0;}).length, up=R.filter(function(r){return r[2]>1.301&&r[1]>0;}).length;
      return pill('decoupleR GATA4 activity: g <b>'+f2(s.g)+'</b>, p '+fp(s.p))+pill('GATA4 targets measured <b>'+R.length+'</b>: <b>'+dn+'</b> down, <b>'+up+'</b> up at adj. p &lt; 0.05')+pill(studyLine(byId[c]));}});
}
/* ---------------- F3: conduction heatmap ---------------- */
function f3fig(el,D){
  var plot=q(el,'.ixplot'), ord='mean', hl=null, csel='all';
  var SH={duan_mouse_JQ1_rest:'Mouse sham',duan_hiPSCCM_ET1_JQ1:'iPSC-CM ET-1',anand_mouse_TACd3_JQ1:'TAC d3',anand_mouse_TACd11_JQ1:'TAC d11',anand_mouse_TACd28_JQ1:'TAC d28',anand_NRVM_PE90_JQ1:'NRVM 90 min',anand_NRVM_PE360_JQ1:'NRVM 6 h',anand_NRVM_PE2880_JQ1:'NRVM 48 h'};
  q(el,'.fsel').innerHTML='<option value="all">All 8 comparisons</option>'+compOpts(D.comps); q(el,'.fsel').onchange=function(){csel=this.value;tab();};
  q(el,'.ixstats').innerHTML=D.comps.map(function(c){var n=D.nes[c.id];return pill(esc(c.label)+': NES <b>'+n.nes.toFixed(2)+'</b>'+(n.padj<0.05?'*':''));}).join('');
  var byId={}; D.comps.forEach(function(c){byId[c.id]=c;});
  var tbl=new Table(q(el,'.ixtbl'),[{k:'gene',label:'Gene'},{k:'model',label:'Comparison'},{k:'lfc',label:'log2FC',fmt:f2,sig:'padj',abs:true},{k:'padj',label:'Adjusted p',fmt:fp},{k:'study',label:'Study'},{k:'method',label:'Method'}],'action_potential_genes');
  function allRows(){return D.full.map(function(r){var c=byId[r[1]];return {gene:r[0],model:c.label,lfc:r[2],padj:r[3],study:c.study+', '+c.geo,method:c.method};});}
  tbl.allFn=allRows;
  function tab(){var rs=allRows(); if(csel!=='all'){var L=byId[csel].label; rs=rs.filter(function(r){return r.model===L;});} tbl.set(rs,hl,el._sorted?undefined:'padj'); el._sorted=1;}
  function draw(){
    var idx=D.genes.map(function(g,i){return i;}); if(ord==='alpha') idx.sort(function(a,b){return D.genes[a]<D.genes[b]?-1:1;});
    var y=idx.map(function(i){return D.genes[i];}), z=idx.map(function(i){return D.lfc[i];}), t=idx.map(function(i){return D.padj[i].map(function(p){return p!==null&&p<0.05?'*':'';});});
    var cd=idx.map(function(i){return D.comps.map(function(c,j){return [fp(D.padj[i][j]),studyLine(c),esc(c.label)];});});
    var m=mobile(), rowH=m?13:15, h=y.length*rowH+(m?190:170);
    plot.style.height=h+'px';
    var labs=D.comps.map(function(c){return m?SH[c.id]:c.label;}); var tr=[{type:'heatmap',x:labs,y:y,z:z,text:t,texttemplate:'%{text}',textfont:{size:m?9:11,color:'#1c1a15'},customdata:cd,zmin:-2,zmax:2,zmid:0,xgap:1,ygap:1,
      colorscale:[[0,'#2166AC'],[0.25,'#92C5DE'],[0.5,'#F7F7F7'],[0.75,'#F4A582'],[1,'#B2182B']],
      colorbar:{orientation:'h',x:0.5,xanchor:'center',y:1.0,yanchor:'bottom',len:m?0.8:0.45,thickness:10,title:{text:'log2FC (clipped at 2)',side:'top',font:{size:11}},tickfont:{size:10},outlinewidth:0},
      hovertemplate:'<b>%{y}</b><br>%{customdata[2]}<br>log2FC %{z:.2f}, adj. p %{customdata[0]}<br>%{customdata[1]}<extra></extra>'}];
    var lay=baseLayout('',''); lay.margin={l:m?62:76,r:10,t:m?62:58,b:10};
    lay.xaxis={side:'bottom',tickangle:m?-90:-35,automargin:true,tickfont:{size:m?10:11},showgrid:false,zeroline:false,fixedrange:true};
    lay.yaxis={autorange:'reversed',automargin:true,tickfont:{size:m?9.5:11},showgrid:false,zeroline:false,fixedrange:true,dtick:1};
    var found=hl&&y.indexOf(hl)>=0;
    lay.shapes=found?[{type:'rect',xref:'paper',x0:0,x1:1,yref:'y',y0:y.indexOf(hl)-0.5,y1:y.indexOf(hl)+0.5,line:{color:'#000',width:2},fillcolor:'rgba(0,0,0,0)'}]:[];
    return Plotly.react(plot,tr,lay,CFG).then(function(){tab(); return found;});
  }
  el.querySelectorAll('.seg button').forEach(function(b){b.onclick=function(){el.querySelectorAll('.seg button').forEach(function(x){x.classList.remove('on');});b.classList.add('on');ord=b.getAttribute('data-v');draw();};});
  searchBind(el,function(g){hl=g;return draw();});
  var t=null; window.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(draw,250);});
  return draw();
}
/* ---------------- F4: snRNA pseudobulk ---------------- */
function setMode(D,g){return D._p[g]?1:D._o[g]?2:0;}
var SETL=['other gene','BRD4 program','other mitochondrial'];
function f4fig(el,D){
  D._p={};D.prog.forEach(function(g){D._p[g]=1;}); D._o={};D.omito.forEach(function(g){D._o[g]=1;});
  function rows(c,f){return D.d[c].filter(function(r){var s=setMode(D,D.genes[r[0]]);return f==='all'||(f==='p'&&s===1)||(f==='o'&&s===2);}).map(function(r){var g=D.genes[r[0]];return {gene:g,set:SETL[setMode(D,g)],lfc:r[1],padj:nlp2p(r[2]),cpm:r[3],ct:c};});}
  return volcano(el,{keys:D.ctypes,keyOpts:D.ctypes.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>';}).join(''),name:'snRNA_pseudobulk_DCM_vs_NF',sortK:'padj',
    filters:[['p','BRD4 program genes'],['o','Other mitochondrial genes'],['all','All genes']],
    cols:[{k:'gene',label:'Gene'},{k:'set',label:'Gene group'},{k:'lfc',label:'log2FC',fmt:f2,sig:'padj',abs:true},{k:'padj',label:'FDR',fmt:fp},{k:'cpm',label:'log2 CPM',fmt:function(v){return v.toFixed(1);}},{k:'ct',label:'Cell type'}],
    rows:rows, allRows:function(){var o=[];D.ctypes.forEach(function(c){o=o.concat(rows(c,'p'));});return o;},
    groups:[{k:0,color:C.bg,size:4,op:0.35},{k:2,color:C.omito,size:6,op:0.85},{k:1,color:C.prog,size:7,op:0.95}],
    points:function(c){return D.d[c].map(function(r){var g=D.genes[r[0]],s=setMode(D,g);return {gene:g,x:r[1],y:r[2],sig:r[2]>1.301,grp:s,cd:[g,fp(nlp2p(r[2])),SETL[s],r[3].toFixed(1)]};});},
    hover:function(c){return '<b>%{customdata[0]}</b>, %{customdata[2]}<br>log2FC %{x:.2f}, FDR %{customdata[1]}<br>log2 CPM %{customdata[3]}<br>'+esc(c)+', DCM vs non-failing<br>Reichart et al. 2022, donor pseudobulk, edgeR<extra></extra>';},
    xt:'log2FC, DCM vs non-failing (donor pseudobulk)',xs:'log2FC, DCM vs NF',yt:'-log10 FDR',
    stats:function(c){var s=D.stats[c], P=D.d[c].filter(function(r){return D._p[D.genes[r[0]]];}), dn=P.filter(function(r){return r[2]>1.301&&r[1]<0;}).length, up=P.filter(function(r){return r[2]>1.301&&r[1]>0;}).length;
      return (s.beta!==null?pill('Program score, mixed model: <b>'+f2(s.beta)+' SD</b>, p '+fp(s.p)+' ('+s.donors+' donors, '+s.nuclei.toLocaleString()+' nuclei)'):'')+
        (s.cam_p!==null?pill('camera gene-set test: '+s.cam_dir.toLowerCase()+', p <b>'+fp(s.cam_p)+'</b>'):'')+pill('Program genes at FDR &lt; 0.05: <b>'+dn+'</b> down, <b>'+up+'</b> up of '+P.length);}});
}
/* ---------------- F5: deconvolution ---------------- */
function f5fig(el,D){
  var all=D.rows.map(function(r){return {gene:r[0],lfc:r[1],y:r[2],padj:nlp2p(r[2]),ave:r[3],s:r[4]};});
  function rows(k,f){return all.filter(function(r){return f==='all'||(f==='p'&&r.s===1)||(f==='o'&&r.s===2);}).map(function(r){return {gene:r.gene,set:SETL[r.s],lfc:r.lfc,padj:r.padj,ave:r.ave};});}
  return volcano(el,{keys:['cm'],name:'deconvolved_cardiomyocyte_DCM_vs_NF',sortK:'padj',
    filters:[['p','BRD4 program genes'],['o','Other mitochondrial genes'],['all','All genes']],
    cols:[{k:'gene',label:'Gene'},{k:'set',label:'Gene group'},{k:'lfc',label:'log2FC',fmt:f2,sig:'padj',abs:true},{k:'padj',label:'Adjusted p',fmt:fp},{k:'ave',label:'Mean log2 expr',fmt:function(v){return v.toFixed(1);}}],
    rows:rows, allRows:function(){return rows('cm','all');},
    groups:[{k:0,color:C.bg,size:4,op:0.4},{k:2,color:C.omito,size:6,op:0.85},{k:1,color:C.prog,size:7,op:0.95}],
    points:function(){return all.map(function(r){return {gene:r.gene,x:r.lfc,y:r.y,sig:r.y>1.301,grp:r.s,cd:[r.gene,fp(r.padj),SETL[r.s],r.ave.toFixed(1)]};});},
    hover:function(){return '<b>%{customdata[0]}</b>, %{customdata[2]}<br>log2FC %{x:.3f}, adj. p %{customdata[1]}<br>Mean log2 expression %{customdata[3]}<br>Deconvolved cardiomyocytes, DCM vs non-failing<br>MAGNet GSE141910, InstaPrism, limma-trend<extra></extra>';},
    xt:'log2FC, DCM vs non-failing (deconvolved cardiomyocyte expression)',xs:'log2FC, DCM vs NF',yt:'-log10 adjusted p',
    stats:function(){var P=all.filter(function(r){return r.s===1;}), dn=P.filter(function(r){return r.padj<0.05&&r.lfc<0;}).length, up=P.filter(function(r){return r.padj<0.05&&r.lfc>0;}).length;
      return pill('Program score in cardiomyocytes, DCM vs NF: <b>'+f2(D.model.est)+'</b>, p '+fp(D.model.p)+' ('+D.model.n+' hearts)')+pill('Program genes at adj. p &lt; 0.05: <b>'+dn+'</b> down, <b>'+up+'</b> up of '+P.length);}});
}
/* ---------------- F6: MAGMA and scDRS ---------------- */
function f6fig(el,D){
  var plot=q(el,'.ixplot'), hl=null, filt='top';
  var all=D.rows.map(function(r){return {gene:r[0],chr:r[1],pos:r[2],z:r[3],p:r[4],y:-Math.log10(Math.max(r[4],1e-300)),prog:r[5],top:r[6]};});
  var fs=q(el,'.fsel'); fs.innerHTML='<option value="top">Top 1,000 scDRS risk genes</option><option value="p">BRD4 program genes</option><option value="all">All genes</option>'; fs.onchange=function(){filt=this.value;tab();};
  var tbl=new Table(q(el,'.ixtbl'),[{k:'gene',label:'Gene'},{k:'chr',label:'Chr'},{k:'z',label:'MAGMA z',fmt:function(v){return v.toFixed(2);}},{k:'p',label:'MAGMA p',fmt:fp},{k:'top',label:'scDRS top 1,000'},{k:'prog',label:'BRD4 program'}],'DCM_MAGMA_genes');
  function rws(f){return all.filter(function(r){return f==='all'||(f==='top'&&r.top)||(f==='p'&&r.prog);}).map(function(r){return {gene:r.gene,chr:r.chr,z:r.z,p:r.p,top:r.top?'yes':'no',prog:r.prog?'yes':'no'};});}
  tbl.allFn=function(){return rws('all');};
  function tab(){tbl.set(rws(filt),hl,el._sorted?undefined:'p',hl?rws('all'):null); el._sorted=1;}
  var cmz=D.ct.filter(function(c){return c[0]==='cardiac muscle cell';})[0], cr=D.cor.set_BRD4_mito_program, nb=all.filter(function(r){return r.prog&&r.top;}).length;
  var sorted=D.ct.filter(function(c){return c[0]!=='unknown';}).sort(function(a,b){return b[1]-a[1];});
  q(el,'.ixstats').innerHTML=pill('scDRS cardiomyocytes: MC z <b>'+cmz[1].toFixed(2)+'</b>, MC p '+fp(cmz[2]))+pill('Next: '+esc(sorted[1][0])+' z '+sorted[1][1].toFixed(2)+', '+esc(sorted[2][0])+' z '+sorted[2][1].toFixed(2))+
    pill('Within cardiomyocytes, risk vs BRD4 program: r <b>'+f2(cr.r)+'</b>, MC p '+fp(cr.p))+pill('BRD4 program genes in the top 1,000: <b>'+nb+'</b>');
  function draw(){
    var tr=[], m=mobile();
    [0,1].forEach(function(par){var s=all.filter(function(r){return !r.top&&!r.prog&&(parseInt(r.chr,10)%2)===par;});
      tr.push(scat(s.map(function(r){return r.pos;}),s.map(function(r){return r.y;}),s.map(function(r){return [r.gene,r.chr,r.z.toFixed(2),fp(r.p),'other gene'];}),par?'#9E9E9E':'#CFCFCF',4,0.6,null,true));});
    var g1=all.filter(function(r){return r.top&&!r.prog;}), g2=all.filter(function(r){return r.prog;});
    tr.push(scat(g1.map(function(r){return r.pos;}),g1.map(function(r){return r.y;}),g1.map(function(r){return [r.gene,r.chr,r.z.toFixed(2),fp(r.p),'scDRS top 1,000 risk gene'];}),C.top,6,0.85,null,true));
    tr.push(scat(g2.map(function(r){return r.pos;}),g2.map(function(r){return r.y;}),g2.map(function(r){return [r.gene,r.chr,r.z.toFixed(2),fp(r.p),r.top?'BRD4 program gene, in scDRS top 1,000':'BRD4 program gene'];}),C.prog,7,0.95,null,true));
    var ht='<b>%{customdata[0]}</b>, chr%{customdata[1]}<br>MAGMA z %{customdata[2]}, p %{customdata[3]}<br>%{customdata[4]}<br>HERMES DCM GWAS, MAGMA v1.10<extra></extra>';
    tr.forEach(function(t){t.hovertemplate=ht;});
    var bon=-Math.log10(0.05/all.length);
    var cands=all.filter(function(r){return r.y>bon;}).sort(function(a,b){return b.y-a.y;}).slice(0,40).map(function(r){return {x:r.pos,y:r.y,text:r.gene};});
    var found=null; if(hl){found=all.filter(function(r){return r.gene===hl;})[0]; if(found){tr.push(ring(found.pos,found.y,hl)); cands.unshift({x:found.pos,y:found.y,text:hl,forced:true});}}
    var lay=baseLayout('Chromosome','-log10 MAGMA gene p'); var MT={'1':1,'3':1,'5':1,'7':1,'9':1,'11':1,'13':1,'15':1,'17':1,'20':1}; var tk=D.ticks.filter(function(t){return !m||MT[t[1]];});
    lay.xaxis.tickvals=tk.map(function(t){return t[0];}); lay.xaxis.ticktext=tk.map(function(t){return t[1];}); lay.xaxis.zeroline=false; lay.xaxis.showgrid=false; lay.xaxis.tickangle=0;
    lay.yaxis.range=[0,Math.max.apply(null,all.map(function(r){return r.y;}))*1.1];
    lay.shapes=[{type:'line',xref:'paper',x0:0,x1:1,y0:bon,y1:bon,line:{color:'#8a8478',width:1,dash:'dash'}}];
    return Plotly.react(plot,tr,lay,CFG).then(function(){el._cands={list:cands,max:m?5:10}; el._label(); tab(); return !!found;});
  }
  el._label=bindLabels(plot,function(){return el._cands||{list:[],max:0};});
  searchBind(el,function(g){hl=g;return draw();});
  return draw();
}
var FIG={f1:['f1_bd.json',f1],f2:['f2_gata4.json',f2fig],f3:['f3_conduction.json',f3fig],f4:['f4_snrna.json',f4fig],f5:['f5_deconv.json',f5fig],f6:['f6_scdrs.json',f6fig]};
function boot(el){ if(el._booted) return; el._booted=true; var f=FIG[el.getAttribute('data-fig')]; var ph=q(el,'.ph'); if(ph) ph.textContent='Loading interactive figure...';
  loadPlotly().then(function(){return getJSON(BASE+'data/'+f[0]);}).then(function(D){ if(ph) ph.remove(); return f[1](el,D);}).then(function(){el.setAttribute('data-ready','1');})
  .catch(function(e){ if(ph) ph.textContent='The interactive figure could not load. The static figure above shows the same result.'; console.error(e); el.setAttribute('data-ready','err');}); }
function init(){ var els=document.querySelectorAll('.ix[data-fig]'); if(!('IntersectionObserver' in window)){els.forEach(boot);return;}
  var io=new IntersectionObserver(function(en){en.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);boot(e.target);}});},{rootMargin:'600px 0px'});
  els.forEach(function(e){io.observe(e);}); window.IXboot=boot; }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
