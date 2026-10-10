const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const posterData=structuredClone(data),posterIds=['900001','900002','900003','900004','900005','900006'];
posterData.revenueExperiment={enabled:true,id:'loading-test',title:'Test shelf',groups:[0,1].map(group=>({id:'group'+group,title:'Group '+group,
  items:posterIds.slice(group*3,group*3+3).map(id=>({id,coin:100}))}))};
for(const id of posterIds)posterData.works[id]={title:'Poster '+id,buy:'코인',pub:'2000-01-01',models:[],safe:true,img:'assets/covers/'+id+'.webp'};
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const early=inline.find(code=>code.includes('Start the public catalogue request'));
const logic=html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function fixture({fetch,search='?preview=1',hash='',historyState=null,frame=false,embedded=false,resourceMap}={}){
  const window={};window.parent=frame?{postMessage(){}}:window;
  if(resourceMap)window.__resources=resourceMap;
  const preloads=[];
  window.addEventListener=()=>{};
  if(embedded)window.BCUT_DATA=data;
  const context=vm.createContext({window,fetch,console,Date,URL,URLSearchParams,
    location:{search,pathname:'/',hash,href:'https://bcutrank.com/'+search+hash},history:{state:historyState,replaceState(){}},
    document:{body:{style:{}},head:{appendChild(link){preloads.push(link);}},createElement(){return {setAttribute(key,value){this[key]=value;}};},getElementById(){return null;},querySelector(){return null;}},
    localStorage:{getItem(){return null;},setItem(){}},
    DCLogic:class{constructor(){this.props={};}setState(patch){Object.assign(this.state,patch);}}});
  vm.runInContext(early,context);
  vm.runInContext(inline.find(code=>code.includes('window.BCUTCatalogueUI =')),context);
  vm.runInContext(inline.find(code=>code.includes('window.BCUTSearch=')),context);
  vm.runInContext(logic+'\nthis.App=Component;',context);
  const app=new context.App();app._admin=/[?&](admin|preview)=1/.test(search);let applied;
  app.apply=value=>{applied=value;};
  return {window,app,preloads,get applied(){return applied;}};
}
(async()=>{
  let resolve,calls=0;
  const pending=fixture({fetch:()=>{calls++;return calls===1?new Promise(done=>{resolve=done;}):Promise.resolve({ok:true,json:async()=>data});}});
  assert.equal(calls,1,'Data starts before component mount');
  assert(pending.window.__resources,'Standalone page supplies the runtime resource mode before boot');
  const existingResources={'./vendor/react.production.min.js':'bundled-react.js'};
  const existing=fixture({embedded:true,resourceMap:existingResources});assert.equal(existing.window.__resources,existingResources,'Existing resource mappings are preserved');
  assert.equal(fixture({frame:true,search:'?preview=1'}).window.__resources,undefined,'Editor iframe retains its template refresh behavior');
  for(const label of ['모델 선택','작가 선택','공개 연도','공개 상태','결과 정렬'])
    assert(html.includes('<sc-raw-select aria-label="'+label+'"'),'Browser parsing preserves native select templates before the single runtime boot');
  const loading=pending.app.load();assert.equal(calls,1,'Mount reuses in-flight request');
  resolve({ok:true,json:async()=>posterData});await loading;
  assert.equal(pending.applied,posterData);assert.equal(pending.window.BCUT_INITIAL_DATA,null);
  assert.deepEqual(pending.preloads.map(link=>link['data-bcut-first-poster']),posterIds.slice(0,2),'First two visible posters are requested before catalogue apply');
  assert(pending.preloads.every(link=>link.rel==='preload'&&link.as==='image'&&link.fetchpriority==='high'));
  assert.equal(pending.preloads[0].href,new URL(posterData.works[posterIds[0]].img,'https://bcutrank.com/').href,'Preload uses the original thumbnail URL');
  await pending.app.load();assert.equal(calls,2,'Later reload is fresh');
  for(const failure of [()=>Promise.reject(new Error('offline')),()=>Promise.resolve({ok:false,status:503}),()=>Promise.resolve({ok:true,json:async()=>{throw new Error('bad JSON');}}),()=>Promise.resolve({ok:true,json:async()=>[]})]){
    let attempts=0;
    const recovery=fixture({fetch:()=>++attempts===1?failure():Promise.resolve({ok:true,json:async()=>data})});
    await recovery.app.load();assert.equal(recovery.applied,data);assert.equal(attempts,2,'Early failure falls back to normal load');
  }
  for(const options of [{embedded:true},{frame:true,search:'?preview=1'},{frame:true,search:'?admin=1'}]){
    let requests=0;const special=fixture({...options,fetch:async()=>{requests++;return {ok:true,json:async()=>data};}});
    await special.app.load();assert.equal(requests,0,'Embedded data and editor preview avoid catalogue fetch');
    if(options.embedded)assert.equal(special.applied,data);else assert.equal(special.applied,undefined);
  }
  async function warmed(catalogue,options={}){
    const test=fixture({...options,fetch:async()=>({ok:true,json:async()=>catalogue})});
    await test.window.BCUT_INITIAL_DATA;return test;
  }
  for(const options of [{hash:'#/search'},{hash:'#/models'},{hash:'#/new'},{search:'?preview=1&w=2226'},
    {historyState:{bcutList:{version:1,url:'/?preview=1',values:{view:'search'}}}}]){
    assert.equal((await warmed(posterData,options)).preloads.length,0,'Other views, restored lists and work deep links avoid unrelated preloads');
  }
  for(const mutate of [d=>{d.revenueExperiment.enabled=false;},d=>{d.revenueExperiment.startsAt='2999-01-01';},
    d=>{d.revenueExperiment.endsAt='2000-01-01';},d=>{d.revenueExperiment.startsAt='invalid';},
    d=>{d.revenueExperiment.groups[1].items.pop();},d=>{d.works[posterIds[0]].pub='2999-01-01';},
    d=>{d.revenueExperiment.groups[0].items[1].id=posterIds[0];},d=>{d.works[posterIds[0]].buy='구독';}]){
    const changed=structuredClone(posterData);mutate(changed);
    assert.equal((await warmed(changed)).preloads.length,0,'Hidden or invalid recommendation shelves do not preload');
  }
  const duplicateImage=structuredClone(posterData);duplicateImage.works[posterIds[1]].img=duplicateImage.works[posterIds[0]].img;
  assert.equal((await warmed(duplicateImage)).preloads.length,1,'Same image URL is preloaded once');
  const noImage=structuredClone(posterData);noImage.works[posterIds[0]].img='';
  assert.equal((await warmed(noImage)).preloads.length,1,'Empty image URLs are skipped');
  const hero=fixture({embedded:true});Object.assign(hero.app.state,{D:posterData,wi:data.weeks.length-1,view:'home',mob:true,spot:0});
  const slides=Array.from({length:8},(_,i)=>({id:'',title:'Card '+i,img:'https://example.com/'+i+'.webp',bg:i===0?'https://example.com/banner.webp':'',manual:i===0}));
  hero.app.buildSpotlight=()=>slides;
  let values=hero.app.vals();
  assert.equal(values.paidPickShow,'block');
  assert.deepEqual(Array.from(values.paidPickGroups.flatMap(group=>group.items),item=>[item.id,item.loading,item.fetchPriority]),
    posterIds.map((id,i)=>[id,i<2?'eager':'lazy',i<2?'high':'auto']),
    'Only the first visible recommendation row receives eager high priority');
  assert(html.includes('loading="{{ p.loading }}" fetchpriority="{{ p.fetchPriority }}" decoding="async"'),'Rendered poster uses the selected priority');
  const ready=()=>Array.from(values.slides,(slide,i)=>slide.img.startsWith('https:')?i:null).filter(i=>i!==null);
  assert.equal(values.slides.length,10,'Infinite carousel retains both clones');
  assert.deepEqual(ready(),[0,1,2]);assert.equal(values.slides[1].fetchPriority,'high');
  assert(values.slides.every(slide=>slide.imgCss==='none'),'Mobile does not request hidden backdrop images');
  assert.equal(values.slides[1].bg,'https://example.com/banner.webp');
  hero.app.state.spot=4;values=hero.app.vals();assert.deepEqual(ready(),[0,1,2,4,5,6]);
  assert.equal(values.slides[5].fetchPriority,'high');assert.equal(values.slides[1].loading,'lazy','Visited images stay present without eager priority');
  hero.app.state.edge='right';values=hero.app.vals();assert(ready().includes(9));assert.equal(values.slides[9].fetchPriority,'high','Forward wrap loads the clone');
  hero.app.state.edge='left';values=hero.app.vals();assert.equal(values.slides[0].fetchPriority,'high','Backward wrap loads the clone');
  Object.assign(hero.app.state,{D:structuredClone(data),spot:0,edge:'',mob:false});values=hero.app.vals();assert.deepEqual(ready(),[0,1,2],'Fresh data resets visited images');
  assert.equal(values.slides[2].imgCss,'url("https://example.com/1.webp")');
  assert.equal(values.slides[3].imgCss,'none','Offscreen desktop backdrop is deferred');
  assert(html.includes('src="{{ s.bg }}" loading="{{ s.loading }}" fetchpriority="{{ s.fetchPriority }}"'),'Manual banner uses native image priority');
  assert(/<script src="\.\/support\.js" defer>/.test(html));
  for(const script of ['react.production.min.js','react-dom.production.min.js'])assert(html.includes('rel="preload" as="script" href="./vendor/'+script+'"'));
  const clock=fixture({embedded:true}).app;let renders=0;
  const start=Date.parse('2026-10-10T10:00:00+09:00');
  clock.state.D={works:{1:{}},timesales:[],packages:[],popups:[]};clock.state.now=start;
  clock.setState=patch=>{renders++;Object.assign(clock.state,patch);};
  for(let i=1;i<60;i++)clock.tickClock(start+i*1000);
  assert.equal(renders,0,'No full catalogue render for unchanged seconds');
  clock.tickClock(start+60000);assert.equal(renders,1,'Minute boundary refreshes public date information');
  clock.state.D.timesales=[{id:'1',end:new Date(start+65000).toISOString()}];
  for(let i=61;i<=65;i++)clock.tickClock(start+i*1000);
  assert.equal(renders,6,'Visible countdown and its expiry retain second precision');
  clock.tickClock(start+66000);assert.equal(renders,6,'Expired countdown stops repeated renders');
  clock.state.D.timesales=[];clock.state.D.packages=[{end:new Date(start+67000).toISOString()}];
  clock.tickClock(start+67000);assert.equal(renders,7,'Package expiry updates without waiting for the next minute');
  clock._admin=false;clock.state.D.popups=[{id:'test',img:'banner.jpg',start:new Date(start+68000).toISOString(),end:new Date(start+69000).toISOString()}];
  clock.tickClock(start+68000);clock.tickClock(start+69000);assert.equal(renders,9,'Scheduled popup boundaries update immediately');
  clock.state.D.revenueExperiment={enabled:true,startsAt:new Date(start+70000).toISOString(),endsAt:new Date(start+71000).toISOString()};
  clock.tickClock(start+70000);clock.tickClock(start+71000);assert.equal(renders,11,'Recommendation experiment boundaries stay precise');
  clock.state.now=Date.parse('2026-10-10T23:59:59+09:00');clock.tickClock(clock.state.now+1000);assert.equal(renders,12,'KST midnight refreshes release lists');
  clock.state.D=null;clock.tickClock(clock.state.now+60000);assert.equal(renders,12,'Loading state avoids catalogue clock renders');
  console.log(JSON.stringify({result:'PASS',scenarios:['early in-flight request reused once','reload requests fresh data','network/HTTP/JSON failure recovery','embedded/editor preview preserved','initial hero requests limited to three cards','jump and both wrap directions load images','mobile hidden backgrounds omitted','native banner priority','fresh catalogue resets carousel resources','unchanged seconds skip catalogue render','discount countdown and expiry','package/popup/experiment boundaries','KST midnight release refresh']}));
})().catch(error=>{console.error(error);process.exitCode=1;});
