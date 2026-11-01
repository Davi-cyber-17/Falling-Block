const COLS=10,ROWS=20,S=30,W=COLS*S,H=ROWS*S;
const SHAPES={
I:[[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
O:[[1,1],[1,1]],
T:[[0,1,0],[1,1,1],[0,0,0]],
S:[[0,1,1],[1,1,0],[0,0,0]],
Z:[[1,1,0],[0,1,1],[0,0,0]],
J:[[1,0,0],[1,1,1],[0,0,0]],
L:[[0,0,1],[1,1,1],[0,0,0]]};
const COLORS={I:['#8ffcff','#00b8e6'],O:['#fff08a','#ffb800'],T:['#e08cff','#9b2dff'],S:['#8dffb0','#00d65a'],Z:['#ff8aa8','#ff2d5f'],J:['#8fa8ff','#3355ff'],L:['#ffc58a','#ff7a00']};
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const hc=document.getElementById('hold').getContext('2d'),nc=document.getElementById('next').getContext('2d');
let fx=[],K=1;
/* ---- canvas nítido em qualquer tela (DPR + tamanho CSS) ---- */
const dims=new Map(),ro=new ResizeObserver(es=>es.forEach(e=>fit(e.target)));
function fit(c){
  const d=dims.get(c),r=c.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,3);
  const w=Math.max(1,Math.round(r.width*dpr)),h=Math.round(w*d.lh/d.lw);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  d.k=w/d.lw;
}
function reg(c,lw,lh){dims.set(c,{lw,lh,k:1});c.style.aspectRatio=lw+'/'+lh;ro.observe(c);fit(c)}
const mqP=matchMedia('(orientation:portrait)');let horiz=mqP.matches;
function setMode(){
  horiz=mqP.matches;const n=document.getElementById('next');
  const d=dims.get(n);d.lw=horiz?240:80;d.lh=horiz?80:240;n.style.aspectRatio=d.lw+'/'+d.lh;fit(n);
}
let board,cur,queue,held,canHold,score,lines,level,best=0,state='idle',acc=0,last=0;
try{best=+localStorage.getItem('fb_best')||0}catch(e){}
const $=id=>document.getElementById(id);
$('best').textContent=best;
reg(cv,W,H);reg($('hold'),80,80);reg($('next'),horiz?240:80,horiz?80:240);
mqP.addEventListener?mqP.addEventListener('change',setMode):mqP.addListener(setMode);

function bag(){const b=Object.keys(SHAPES);for(let i=b.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[b[i],b[j]]=[b[j],b[i]]}return b}
function fill(){while(queue.length<6)queue.push(...bag())}
function spawn(t){
  t=t||queue.shift();fill();
  const m=SHAPES[t].map(r=>r.slice());
  cur={t,m,x:Math.floor((COLS-m[0].length)/2),y:t==='I'?-1:0};
  if(collide(cur.m,cur.x,cur.y))gameOver();
}
function collide(m,x,y){
  for(let r=0;r<m.length;r++)for(let c=0;c<m[r].length;c++)if(m[r][c]){
    const nx=x+c,ny=y+r;
    if(nx<0||nx>=COLS||ny>=ROWS)return true;
    if(ny>=0&&board[ny][nx])return true;
  }return false;
}
function rot(m,dir){
  const n=m.length,o=m.map(r=>r.slice());
  for(let r=0;r<n;r++)for(let c=0;c<n;c++){if(dir>0)o[c][n-1-r]=m[r][c];else o[n-1-c][r]=m[r][c]}
  return o;
}
function rotate(dir=1){
  if(state!=='play')return;
  const m=rot(cur.m,dir);
  for(const k of [0,-1,1,-2,2]){if(!collide(m,cur.x+k,cur.y)){cur.m=m;cur.x+=k;return}}
  if(!collide(m,cur.x,cur.y-1)){cur.m=m;cur.y--}
}
function move(d){if(state==='play'&&!collide(cur.m,cur.x+d,cur.y))cur.x+=d}
function soft(){
  if(state!=='play')return;
  if(!collide(cur.m,cur.x,cur.y+1)){cur.y++;addScore(1)}else lock();
  acc=0;
}
function ghostY(){let y=cur.y;while(!collide(cur.m,cur.x,y+1))y++;return y}
function hard(){
  if(state!=='play')return;
  const g=ghostY();addScore((g-cur.y)*2);cur.y=g;lock();
}
function holdPiece(){
  if(state!=='play'||!canHold)return;
  const t=cur.t;
  if(held){const h=held;held=t;spawn(h)}else{held=t;spawn()}
  canHold=false;
}
function lock(){
  let over=false;
  cur.m.forEach((row,r)=>row.forEach((v,c)=>{if(v){const y=cur.y+r;if(y<0)over=true;else board[y][cur.x+c]=cur.t}}));
  if(over){gameOver();return}
  let n=0;
  const full=[];board.forEach((row,r)=>{if(row.every(Boolean))full.push(r)});
  if(full.length)fx.push({rows:full,t:performance.now()});
  for(let r=ROWS-1;r>=0;r--){if(board[r].every(Boolean)){board.splice(r,1);board.unshift(Array(COLS).fill(null));n++;r++}}
  if(n){addScore([0,100,300,500,800][n]*level);lines+=n;level=Math.floor(lines/10)+1;$('level').textContent=level;$('lines').textContent=lines}
  canHold=true;spawn();
}
function addScore(p){
  score+=p;$('score').textContent=score;
  if(score>best){best=score;$('best').textContent=best;try{localStorage.setItem('fb_best',best)}catch(e){}}
}
function speed(){return Math.max(90,1000-(level-1)*90)}
function reset(){
  board=Array.from({length:ROWS},()=>Array(COLS).fill(null));
  queue=[];fill();held=null;canHold=true;score=0;lines=0;level=1;acc=0;
  $('score').textContent=0;$('level').textContent=1;$('lines').textContent=0;fx=[];
  state='play';$('ov').style.display='none';spawn();
}
function gameOver(){
  state='over';$('ovt').textContent='Fim de jogo';$('ovp').textContent='Pontos: '+score;$('go').textContent='Jogar de novo';$('ov').style.display='flex';
}
function togglePause(){
  if(state==='play'){state='pause';$('ovt').textContent='Pausado';$('ovp').textContent='';$('go').textContent='Continuar';$('ov').style.display='flex'}
  else if(state==='pause'){state='play';$('ov').style.display='none'}
}
/* ---- blocos neon (sprites em cache, com glow) ---- */
const sprites=new Map();
function sprite(t,px){
  const key=t+px;let sp=sprites.get(key);if(sp)return sp;
  if(sprites.size>150)sprites.clear();
  const pad=Math.ceil(px*.35),size=px+pad*2,c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d'),[c1,c2]=COLORS[t],m=Math.max(1,px*.06),w=px-m*2,x=pad+m,r=px*.14;
  g.shadowColor=c2;g.shadowBlur=px*.38;
  const gr=g.createLinearGradient(0,pad,0,pad+px);gr.addColorStop(0,c1);gr.addColorStop(1,c2);
  g.fillStyle=gr;g.beginPath();g.roundRect(x,x,w,w,r);g.fill();
  g.shadowBlur=0;
  g.save();g.beginPath();g.roundRect(x,x,w,w,r);g.clip();
  const hl=g.createLinearGradient(x,x,x+w,x+w);hl.addColorStop(0,'rgba(255,255,255,.55)');hl.addColorStop(.45,'rgba(255,255,255,0)');
  g.fillStyle=hl;g.fillRect(x,x,w,w);g.restore();
  g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=Math.max(1,px*.05);g.beginPath();g.roundRect(x+.5,x+.5,w-1,w-1,r);g.stroke();
  g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.roundRect(x+w*.3,x+w*.3,w*.4,w*.4,r*.5);g.fill();
  sp={c,pad};sprites.set(key,sp);return sp;
}
function block(g,x,y,s,t,a=1){
  const px=Math.max(2,Math.round(s*K)),sp=sprite(t,px);
  g.setTransform(1,0,0,1,0,0);g.globalAlpha=a;
  g.drawImage(sp.c,Math.round(x*K-sp.pad),Math.round(y*K-sp.pad));
  g.globalAlpha=1;g.setTransform(K,0,0,K,0,0);
}
function draw(){
  K=dims.get(cv).k;ctx.setTransform(K,0,0,K,0,0);ctx.clearRect(0,0,W,H);
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'rgba(34,229,255,0)');bg.addColorStop(1,'rgba(34,229,255,.07)');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle='rgba(34,229,255,.08)';ctx.lineWidth=1;ctx.beginPath();
  for(let i=1;i<COLS;i++){ctx.moveTo(i*S,0);ctx.lineTo(i*S,H)}
  for(let i=1;i<ROWS;i++){ctx.moveTo(0,i*S);ctx.lineTo(W,i*S)}
  ctx.stroke();
  board.forEach((row,r)=>row.forEach((t,c)=>{if(t)block(ctx,c*S,r*S,S,t)}));
  if(cur&&state!=='over'){
    const gy=ghostY(),col=COLORS[cur.t];
    ctx.lineWidth=1.5;ctx.setLineDash([5,3]);
    cur.m.forEach((row,r)=>row.forEach((v,c)=>{if(v&&gy+r>=0){
      ctx.beginPath();ctx.roundRect((cur.x+c)*S+3,(gy+r)*S+3,S-6,S-6,4);
      ctx.globalAlpha=.14;ctx.fillStyle=col[0];ctx.fill();
      ctx.globalAlpha=.75;ctx.strokeStyle=col[0];ctx.stroke();ctx.globalAlpha=1;
    }}));
    ctx.setLineDash([]);
    cur.m.forEach((row,r)=>row.forEach((v,c)=>{if(v&&cur.y+r>=0)block(ctx,(cur.x+c)*S,(cur.y+r)*S,S,cur.t)}));
  }
  /* flash de linha completa */
  const now=performance.now();fx=fx.filter(f=>now-f.t<380);
  fx.forEach(f=>{
    const a=1-(now-f.t)/380,e=(1-a)*6;
    f.rows.forEach(r=>{
      const gr=ctx.createLinearGradient(0,0,W,0);
      gr.addColorStop(0,'rgba(34,229,255,0)');gr.addColorStop(.5,'rgba(225,255,255,'+a+')');gr.addColorStop(1,'rgba(255,61,242,0)');
      ctx.fillStyle=gr;ctx.fillRect(0,r*S-e,W,S+e*2);
    });
  });
}
function mini(g,c,types,h){
  const d=dims.get(c);K=d.k;g.setTransform(K,0,0,K,0,0);g.clearRect(0,0,d.lw,d.lh);
  const slot=(h?d.lw:d.lh)/types.length,s=16;
  types.forEach((t,i)=>{
    if(!t)return;
    const m=SHAPES[t].filter(r=>r.some(Boolean));
    const cols=m[0].map((_,c)=>c).filter(c=>m.some(r=>r[c]));
    const mw=cols.length*s,mh=m.length*s;
    const ox=h?i*slot+(slot-mw)/2:(d.lw-mw)/2,oy=h?(d.lh-mh)/2:i*slot+(slot-mh)/2;
    m.forEach((r,ri)=>cols.forEach((c2,ci)=>{if(r[c2])block(g,ox+ci*s,oy+ri*s,s,t)}));
  });
}
function loop(ts){
  const dt=ts-last;last=ts;
  if(state==='play'){
    acc+=dt;
    if(acc>=speed()){acc=0;if(!collide(cur.m,cur.x,cur.y+1))cur.y++;else lock()}
    draw();
  }else if(board)draw();
  mini(hc,$('hold'),[held],false);mini(nc,$('next'),queue.slice(0,3),horiz);
  requestAnimationFrame(loop);
}
$('go').onclick=()=>{state==='pause'?togglePause():reset()};
$('pause').onclick=togglePause;
function rep(id,fn,delay){
  const b=$(id);let t;
  const stop=()=>{clearInterval(t);t=null};
  b.addEventListener('pointerdown',e=>{e.preventDefault();fn();if(delay){stop();t=setInterval(fn,delay)}});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stop));
}
rep('bl',()=>move(-1),110);rep('br',()=>move(1),110);rep('bd',soft,60);
rep('bu',()=>rotate(1));rep('bh',holdPiece);rep('drop',hard);
document.addEventListener('keydown',e=>{
  const k=e.key;
  if(k==='Enter'&&state!=='play'){e.preventDefault();$('go').click();return}
  if(['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(k))e.preventDefault();
  if(k==='ArrowLeft')move(-1);else if(k==='ArrowRight')move(1);else if(k==='ArrowDown')soft();
  else if(k==='ArrowUp'||k==='x'||k==='X')rotate(1);else if(k==='z'||k==='Z')rotate(-1);
  else if(k===' ')hard();else if(k==='c'||k==='C'||k==='Shift')holdPiece();
  else if(k==='p'||k==='P')togglePause();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play')togglePause()});
board=Array.from({length:ROWS},()=>Array(COLS).fill(null));queue=[];fill();
requestAnimationFrame(loop);
