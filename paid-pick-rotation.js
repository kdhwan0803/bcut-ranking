(function(root){
'use strict';
const HALF=12*60*60*1000, KST=9*60*60*1000, DAY=86400000;
function slot(now){return Math.floor((now+KST)/HALF);}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function select(data,now=Date.now(),draw=0){
 const source=data.revenueExperiment;if(!source)return null;
 const works=data.works||{},today=new Date(now+KST).toISOString().slice(0,10);
 const cutoff=new Date(now+KST-90*DAY).toISOString().slice(0,10);
 const meta=new Map((source.groups||[]).flatMap(g=>g.items||[]).map(p=>[String(p.id),p]));
 const groups=[{id:'recent',title:'최근 화보에서 골라본 3편',pool:[]},{id:'archive',title:'다시 꺼내볼 과거 화보 3편',pool:[]}];
 for(const [id,w] of Object.entries(works)){
  if(!w.img||w.buy!=='코인'||!/^\d{4}-\d{2}-\d{2}$/.test(w.pub||'')||w.pub>today)continue;
  groups[w.pub>=cutoff?0:1].pool.push(id);
 }
 const used=new Set(),period=slot(now),step=period+Math.max(0,Math.floor(draw));
 for(const g of groups){
  g.pool.sort((a,b)=>hash(g.id+':'+a)-hash(g.id+':'+b)||a.localeCompare(b));
  const n=g.pool.length,start=n?((step*3)%n+n)%n:0;
  const queue=g.pool.slice(start).concat(g.pool.slice(0,start));
  g.items=[];for(const id of queue){
   if(g.items.length>=3)break;if(used.has(id))continue;


   used.add(id);
   g.items.push({...meta.get(id),id});
  }

 }
 return {...source,id:'paid-picks-rotation-v2',groups:groups.map(({pool,...g})=>g),rotationSlot:period,
  rotationCounts:groups.map(g=>g.pool.length)};
}
const api={slot,select};root.BCUTPaidRotation=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window==='undefined'?globalThis:window);
