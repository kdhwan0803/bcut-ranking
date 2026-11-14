/* Public shopping facts and edition navigation. No ranking or catalogue mutation. */
(function(root){
'use strict';
const checked=()=>root.BCUTWorkFacts||{works:{}};
const fact=id=>checked().works?.[String(id)]||{};
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const names=w=>Array.isArray(w?.models)?w.models.slice().sort().join('|'):'';
function editionKind(w){
 const t=String(w?.title||'').normalize('NFKC');
 if(/(?:PHOTO|사진)\s*(?:\+|&)\s*(?:VIDEO|영상)|VIDEO\s*(?:\+|&)\s*PHOTO/i.test(t))return 'combined';
 if(/\(\s*(?:ONLY\s*)?(?:VIDEO|영상)(?:\s*ONLY)?\s*\)|\bVIDEO\s+ONLY\b|\bONLY\s+VIDEO\b|\sVIDEO$/i.test(t))return 'video';
 if(/\(\s*(?:ONLY\s*)?(?:PHOTO|사진)(?:\s*ONLY)?\s*\)|\bPHOTO\s+ONLY\b|\bONLY\s+PHOTO\b|\sPHOTO$/i.test(t))return 'photo';
 return '';
}
function editionBase(w){return String(w?.title||'').normalize('NFKC').replace(/\(\s*(?:ONLY\s*)?(?:PHOTO|VIDEO|사진|영상)(?:\s*ONLY)?\s*\)/gi,'').replace(/\b(?:PHOTO|VIDEO)\s+ONLY\b|\bONLY\s+(?:PHOTO|VIDEO)\b|\s(?:PHOTO|VIDEO)$/gi,'').replace(/\s+/g,' ').trim().toLowerCase();}
const groups=new WeakMap();
function editions(data,id,day){
 const W=data.works||{}, w=W[id];if(!w)return [];
 if(!groups.has(data)){
  const map=new Map();Object.entries(W).forEach(([key,item])=>{const k=editionKind(item);if(k!=='photo'&&k!=='video')return;const b=editionBase(item);if(!b||!item.pub)return;const group=b+'|'+names(item)+'|'+String(item.photo||'').trim().toLowerCase()+'|'+item.pub;if(!map.has(group))map.set(group,[]);map.get(group).push({id:key,kind:k});});
  const byId={};for(const items of map.values())if(items.some(x=>x.kind==='photo')&&items.some(x=>x.kind==='video'))items.forEach(x=>{byId[x.id]=items;});
  [['2392','2393']].forEach(pair=>{if(pair.every(x=>W[x])&&names(W[pair[0]])===names(W[pair[1]])&&W[pair[0]].pub===W[pair[1]].pub)pair.forEach(x=>{byId[x]=pair.map((key,i)=>({id:key,kind:i?'video':'photo'}));});});groups.set(data,byId);
 }
 const pair=(groups.get(data)[String(id)]||[]).filter(x=>W[x.id].pub<=day&&W[x.id].hidden!==true&&W[x.id].published!==false);
 return pair.length>1?pair.slice().sort((a,b)=>a.kind===b.kind?a.id.localeCompare(b.id):a.kind==='photo'?-1:1).map(x=>({...x,current:x.id===String(id),label:(x.kind==='photo'?'사진판':'영상판')+(x.id===String(id)?' · 현재 선택':' 보기')})):[];
}
function duration(seconds){const s=Number(seconds);if(!Number.isFinite(s)||s<=0)return '';const h=Math.floor(s/3600),m=Math.floor(s%3600/60),r=s%60;return(h?h+'시간 ':'')+(m?m+'분 ':'')+(r?r+'초':'').trim();}
function purchase(id,data,subActive,selection,format){
 const w=data.works?.[id]||{}, f=fact(id), coin=Number.isFinite(f.coin)&&f.coin>0?f.coin:Number(selection?.coin)||0;
 const known=coin>0;return {format:(editionKind(w)!=='video'&&f.videos>0&&f.photos>1)?'사진 + 영상':format,price:subActive?'월 19,900원':known?coin.toLocaleString('ko-KR')+'코인':'',
 priceNote:subActive?'구독 중 추가 결제 없이 열람':known?'기준가 '+(coin*(checked().coinKRW||200)).toLocaleString('ko-KR')+'원 · 1코인=200원 · 충전 혜택별 차이':'가격은 B컷에서 확인',original:String(w.title||id)};
}
function summary(id,data){
 const w=data.works?.[id]||{},f=fact(id),parts=[];
 if(w.pub&&w.pub>today())return '공개 후 최종 구성을 확인할 수 있습니다.';
 const kind=editionKind(w);
 if(kind!=='video'){
  if(Number.isInteger(f.photoPages)&&f.photoPages>0)parts.push('사진 '+f.photoPages.toLocaleString('ko-KR')+'p (표지 포함)');
  else if(Number.isInteger(f.photos)&&f.photos>0)parts.push('내지 사진 '+f.photos.toLocaleString('ko-KR')+'장 (표지 제외)');
 }
 if(Number.isInteger(f.videos)&&f.videos>0)parts.push('영상 '+f.videos+'편'+(duration(f.seconds)?' · '+duration(f.seconds):''));
 else if(kind==='video'||w.vid)parts.push('영상 편수·시간은 B컷에서 확인');
 return parts.join(' · ');
}
function verification(id){const d=fact(id).checkedAt||checked().checkedAt;return d?'공식 정보 '+new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric'}).format(new Date(d))+' 확인 · 최종 가격·구성은 B컷 기준':'';}
function recommendations(data,id,day){
 const W=data.works||{},w=W[id]||{}, paired=new Set(editions(data,id,day).map(x=>x.id));paired.add(String(id));
 const released=key=>{const x=W[key];return !paired.has(key)&&x&&x.pub&&x.pub<=day&&x.hidden!==true&&x.published!==false;};
 const sorted=Object.keys(W).filter(released).sort((a,b)=>W[b].pub.localeCompare(W[a].pub)||b.localeCompare(a,undefined,{numeric:true}));
 const sameModel=sorted.filter(key=>(W[key].models||[]).some(n=>(w.models||[]).includes(n)));
 const sameCreator=w.photo?sorted.filter(key=>W[key].photo===w.photo):[];
 const result=[],seen=new Set();const add=(keys,reason,limit)=>{for(const key of keys){if(result.length>=4||limit<=0)break;if(seen.has(key))continue;seen.add(key);result.push({id:key,reason});limit--;}};
 add(sameModel,'같은 모델',2);add(sameCreator,'같은 작가',2);add(sameModel,'같은 모델',4);add(sameCreator,'같은 작가',4);return result;
}
root.BCUTShopping=Object.freeze({editionKind,editions,purchase,summary,verification,recommendations});
if(typeof document!=='undefined'){
 const style=document.createElement('style');style.id='bcut-shopping-styles';style.textContent='.work-buy-facts{margin-top:12px;padding:12px 14px;text-align:left;border:1px solid var(--line);border-radius:10px;background:var(--bg1);font-size:13px;line-height:1.7;color:var(--t1)}.work-buy-facts small{display:block;color:var(--mut);font-size:10.5px;margin-top:6px}.work-editions{margin-top:14px;padding:13px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg1)}.work-editions p{font-size:12px;line-height:1.6;color:var(--t2);margin:0 0 9px}.work-edition-links{display:flex;flex-wrap:wrap;gap:8px}.work-edition-links a{flex:1;min-width:110px;text-align:center;padding:10px 8px;border:1px solid var(--line);border-radius:8px;font-size:12px;font-weight:800;color:var(--txt);text-decoration:none}.work-edition-links a[aria-current="true"]{border-color:var(--acc);color:var(--acc)}.work-related-reason{display:block;font-size:10px;font-weight:800;color:var(--acc);margin:7px 0 3px}.work-purchase-price small{line-height:1.6;max-width:280px;white-space:normal}';document.head.appendChild(style);
}
})(typeof window!=='undefined'?window:globalThis);
