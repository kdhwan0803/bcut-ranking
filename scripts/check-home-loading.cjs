const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const early=inline.find(code=>code.includes('Start the public catalogue request'));
const logic=html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
function fixture({fetch,search='?preview=1',frame=false,embedded=false}={}){
  const window={};window.parent=frame?{postMessage(){}}:window;
  window.addEventListener=()=>{};
  if(embedded)window.BCUT_DATA=data;
  const context=vm.createContext({window,fetch,console,Date,URL,URLSearchParams,
    location:{search,pathname:'/',hash:''},history:{state:null,replaceState(){}},
    document:{body:{style:{}},getElementById(){return null;},querySelector(){return null;}},
    localStorage:{getItem(){return null;},setItem(){}},
    DCLogic:class{constructor(){this.props={};}setState(patch){Object.assign(this.state,patch);}}});
  vm.runInContext(early,context);
  vm.runInContext(inline.find(code=>code.includes('window.BCUTCatalogueUI =')),context);
  vm.runInContext(inline.find(code=>code.includes('window.BCUTSearch=')),context);
  vm.runInContext(logic+'\nthis.App=Component;',context);
  const app=new context.App();app._admin=/[?&](admin|preview)=1/.test(search);let applied;
  app.apply=value=>{applied=value;};
  return {window,app,get applied(){return applied;}};
}
(async()=>{
  let resolve,calls=0;
  const pending=fixture({fetch:()=>{calls++;return calls===1?new Promise(done=>{resolve=done;}):Promise.resolve({ok:true,json:async()=>data});}});
  assert.equal(calls,1,'Data starts before component mount');
  const loading=pending.app.load();assert.equal(calls,1,'Mount reuses in-flight request');
  resolve({ok:true,json:async()=>data});await loading;
  assert.equal(pending.applied,data);assert.equal(pending.window.BCUT_INITIAL_DATA,null);
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
  const hero=fixture({embedded:true});Object.assign(hero.app.state,{D:data,wi:data.weeks.length-1,view:'home',mob:true,spot:0});
  const slides=Array.from({length:8},(_,i)=>({id:'',title:'Card '+i,img:'https://example.com/'+i+'.webp',bg:i===0?'https://example.com/banner.webp':'',manual:i===0}));
  hero.app.buildSpotlight=()=>slides;
  let values=hero.app.vals();
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
  console.log(JSON.stringify({result:'PASS',scenarios:['early in-flight request reused once','reload requests fresh data','network/HTTP/JSON failure recovery','embedded/editor preview preserved','initial hero requests limited to three cards','jump and both wrap directions load images','mobile hidden backgrounds omitted','native banner priority','fresh catalogue resets carousel resources']}));
})().catch(error=>{console.error(error);process.exitCode=1;});
