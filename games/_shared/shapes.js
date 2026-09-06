/* No Excuses — shape geometry shared by Estimate
   Split out of index.html at build 12. Behaviour is identical to build 11. */

/* ---------- shapes (v9): every shape is a set of point loops, longest side 1, centred on 0. Holes run the other way round, so the signed area of the loops is the area ---------- */
const Shapes=(()=>{
  const norm=loops=>{ let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; loops.forEach(L=>L.forEach(([x,y])=>{ x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y); })); const s=Math.max(x1-x0,y1-y0)||1, cx=(x0+x1)/2, cy=(y0+y1)/2; return loops.map(L=>L.map(([x,y])=>[(x-cx)/s,(y-cy)/s])); };
  const signed=L=>{ let a=0; for(let i=0;i<L.length;i++){ const [x1,y1]=L[i],[x2,y2]=L[(i+1)%L.length]; a+=x1*y2-x2*y1; } return a/2; };
  const area=loops=>Math.abs(loops.reduce((s,L)=>s+signed(L),0));
  const ring=(n,f)=>Array.from({length:n},(_,i)=>f(i/n*2*Math.PI,i));
  const circ=(r,cx=0,cy=0,n=64,rev)=>{ const L=ring(n,a=>[cx+r*Math.cos(a),cy+r*Math.sin(a)]); return rev?L.reverse():L; };
  // cells → boundary loops. Every cell contributes four directed edges; an edge shared by two cells cancels; what is left chains into loops, holes running the other way
  function cellLoops(cells){ const edges=new Map(); const add=(a,b)=>{ const k=a+'>'+b, rk=b+'>'+a; if(edges.has(rk)) edges.delete(rk); else edges.set(k,[a,b]); };
    cells.forEach(([x,y])=>{ add([x,y],[x+1,y]); add([x+1,y],[x+1,y+1]); add([x+1,y+1],[x,y+1]); add([x,y+1],[x,y]); });
    const from=new Map(); for(const [a,b] of edges.values()){ const k=a.join(','); (from.get(k)||from.set(k,[]).get(k)).push(b); }
    const loops=[]; while(from.size){ const start=from.keys().next().value; let cur=start.split(',').map(Number); const L=[];
      for(let guard=0;guard<4000;guard++){ L.push(cur); const k=cur.join(','); const outs=from.get(k); if(!outs||!outs.length){ from.delete(k); break; } cur=outs.shift(); if(!outs.length) from.delete(k); if(cur.join(',')===start) break; }
      if(L.length>2) loops.push(L.filter((p,i)=>{ const a=L[(i-1+L.length)%L.length], b=L[(i+1)%L.length]; return !((a[0]===p[0]&&p[0]===b[0])||(a[1]===p[1]&&p[1]===b[1])); })); }
    return loops; }
  const has=(cells,x,y)=>cells.some(c=>c[0]===x&&c[1]===y);
  const R=n=>Math.random()*n|0, pick=a=>a[R(a.length)];
  const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
  // polyominoes: a random walk that mostly keeps going (a line of squares), a compact blob, stairs, a plus, an L, a T, and a chain of rectangles
  function walk(k,straight){ const cells=[[0,0]]; let x=0,y=0,d=DIRS[R(4)]; while(cells.length<k){ if(Math.random()>straight) d=DIRS[R(4)]; const nx=x+d[0], ny=y+d[1]; if(!has(cells,nx,ny)) cells.push([nx,ny]); x=nx; y=ny; } return cells; }
  function blob(k){ const cells=[[0,0]]; while(cells.length<k){ const c=pick(cells), d=DIRS[R(4)]; const nx=c[0]+d[0], ny=c[1]+d[1]; if(!has(cells,nx,ny)) cells.push([nx,ny]); } return cells; }
  function stairs(n){ const cells=[]; for(let i=0;i<n;i++){ cells.push([i,i]); cells.push([i+1,i]); } return cells; }
  function plus(a){ const cells=[]; for(let i=-a;i<=a;i++){ cells.push([i,0]); if(i) cells.push([0,i]); } return cells; }
  function rects(n){ const cells=[]; let x=0,y=0; for(let i=0;i<n;i++){ const w=1+R(4), h=1+R(3); for(let dx=0;dx<w;dx++) for(let dy=0;dy<h;dy++) if(!has(cells,x+dx,y+dy)) cells.push([x+dx,y+dy]); if(Math.random()<.5) x+=w; else y+=h; } return cells; }
  function star(){ const n=5+R(3), r1=.5, r2=.18+Math.random()*.16; return ring(n*2,(a,i)=>{ const r=i%2?r2:r1; return [r*Math.cos(a-Math.PI/2),r*Math.sin(a-Math.PI/2)]; }); }
  function jag(){ const n=8+R(6); return ring(n,a=>{ const r=.26+Math.random()*.24; return [r*Math.cos(a),r*Math.sin(a)]; }); }
  function spiral(){ const turns=1.6+Math.random()*1.2, w=.09+Math.random()*.05, r0=.06, b=(.5-w/2-r0)/(turns*2*Math.PI); const n=Math.round(turns*36); const out=[],inn=[];
    for(let i=0;i<=n;i++){ const t=i/n*turns*2*Math.PI, r=r0+b*t; out.push([(r+w/2)*Math.cos(t),(r+w/2)*Math.sin(t)]); inn.push([Math.max(0,r-w/2)*Math.cos(t),Math.max(0,r-w/2)*Math.sin(t)]); }
    return out.concat(inn.reverse()); }
  function crescent(){ const o=[],i=[]; for(let k=0;k<=36;k++){ const a=Math.PI/2+k/36*Math.PI; o.push([.5*Math.cos(a),.5*Math.sin(a)]); } for(let k=36;k>=0;k--){ const a=Math.PI/2+k/36*Math.PI; i.push([.2+.42*Math.cos(a),.42*Math.sin(a)]); } return o.concat(i); }
  const GEN={
    square:()=>[[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]]], circle:()=>[circ(.5)], triangle:()=>[[[0,-.5],[.5,.5],[-.5,.5]]], bar:()=>[[[-.5,-.11],[.5,-.11],[.5,.11],[-.5,.11]]],
    ring:()=>[circ(.5),circ(.2+Math.random()*.14,0,0,64,true)], star:()=>[star()], blob:()=>[jag()],
    line:()=>cellLoops(walk(6+R(5),.78)), tetris:()=>cellLoops(blob(5+R(5))), stairs:()=>cellLoops(stairs(3+R(3))), plus:()=>cellLoops(plus(1+R(2))),
    rects:()=>cellLoops(rects(3+R(3))), spiral:()=>[spiral()], crescent:()=>[crescent()],
  };
  const GROW=['square','circle','triangle','bar','ring','star','blob','line','tetris','stairs','plus','rects','crescent'];
  const CUT=GROW.concat(['spiral','spiral']);
  function make(name){ const loops=norm(GEN[name]()); return { name, loops, coef:area(loops) }; }
  const path=(sh,s,cx,cy)=>sh.loops.map(L=>'M'+L.map(([x,y])=>`${(cx+x*s).toFixed(2)},${(cy+y*s).toFixed(2)}`).join('L')+'z').join('');
  // one side of a line through p0 along d (Sutherland–Hodgman on each loop — holes stay holes)
  function clip(loops,p0,d,side){ const ins=p=>(d[0]*(p[1]-p0[1])-d[1]*(p[0]-p0[0]))*side>=0; const cross=(a,b)=>{ const fa=d[0]*(a[1]-p0[1])-d[1]*(a[0]-p0[0]), fb=d[0]*(b[1]-p0[1])-d[1]*(b[0]-p0[0]); const t=fa/(fa-fb); return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]; };
    return loops.map(L=>{ const out=[]; for(let i=0;i<L.length;i++){ const a=L[i], b=L[(i+1)%L.length], ia=ins(a), ib=ins(b); if(ia) out.push(a); if(ia!==ib) out.push(cross(a,b)); } return out; }).filter(L=>L.length>2); }
  return { make, path, area, clip, GROW, CUT, random:pool=>make(pick(pool)) };
})();


export { Shapes };
