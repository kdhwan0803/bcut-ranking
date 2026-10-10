const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8'));
const mapping=JSON.parse(html.match(/<script id="work-model-links" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const plain=value=>JSON.parse(JSON.stringify(value));
let scroll=0,focused='',extraOpen=false;
const frames=[];
const document={body:{style:{}},activeElement:{id:'catalogue-query'},
  getElementById:id=>id==='work-model-links'?{textContent:JSON.stringify(mapping)}:{focus(){focused=id;}},
  querySelector:selector=>selector==='.search-extra'?{get open(){return extraOpen;},set open(value){extraOpen=value;}}:selector.includes('data-work-id')?{focus(){focused=selector;}}:null};
const window={scrollY:840,scrollTo:(x,y)=>{scroll=y;}};
const location={search:'?preview=1&q=%EB%B0%95',pathname:'/',hash:'#/search'};
const history={state:null,replaceState(state,title,url){this.state=state;if(url){const parsed=new URL(url,'https://bcutrank.com');location.search=parsed.search;location.hash=parsed.hash;}},pushState(state){this.state=state;}};
const context=vm.createContext({window,document,location,history,console,Date,URL,URLSearchParams,localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame:fn=>{frames.push(fn);return frames.length;},DCLogic:class{constructor(){this.props={};}setState(patch){Object.assign(this.state,patch);}}});
const inline=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
vm.runInContext(inline.find(code=>code.includes('window.BCUTCatalogueUI =')),context);
vm.runInContext(inline.find(code=>code.includes('window.BCUTSearch=')),context);
vm.runInContext(html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1]+'\nthis.App=Component;',context);
const api=window.BCUTSearch,memory=window.BCUTListMemory,day='2026-10-10';
const fixture={works:{
  1:{models:['박서이','박서이','슬이'],pub:'2026-10-01'},
  2:{models:['박서이'],pub:'2026-10-10'},
  3:{models:['박서이'],pub:'2026-10-11'},
  4:{models:['박서이'],pub:'2026-02-30'},
  5:{models:['박서이'],pub:'2026-10-10',hidden:true},
  6:{models:['박서이'],pub:'2026-10-10',published:false},
  7:{models:['박서이'],pub:'2026-10-10',status:'draft'},
  8:{models:['E다연'],pub:'2026-10-01'}
}};
const unchanged=JSON.stringify(fixture);
assert.deepEqual(plain(api.modelSuggestions(fixture,' 박 서 ',day)),[{name:'박서이',count:2}]);
assert.deepEqual(plain(api.modelSuggestions(fixture,'',day)),[]);
assert.deepEqual(plain(api.modelSuggestions(fixture,'없는모델',day)),[]);
assert.equal(api.modelSuggestions(fixture,'ｅ다',day)[0].name,'E다연');
assert.equal(api.modelSuggestions(fixture,'박', '2026-10-11')[0].count,3,'KST day change refreshes public counts');
assert.equal(JSON.stringify(fixture),unchanged);
const results=api.modelSuggestions(data,'박',day);assert(results.some(item=>item.name==='박서이'));assert(results.length<=6);
assert.equal(api.modelSuggestions(data,'박서이',day)[0].name,'박서이');
const revised=structuredClone(fixture);api.modelSuggestions(revised,'박',day);revised.works[2].hidden=true;api.invalidate(revised);assert.equal(api.modelSuggestions(revised,'박',day)[0].count,1);
const app=new context.App();Object.assign(app.state,{D:data,wi:data.weeks.length-1,q:'박',view:'search',yearSel:'1900',show:36,searchVideo:true});
let vals=app.vals();assert.equal(vals.searchEmptyShow,'block');assert.equal(vals.searchRelaxShow,'inline-flex');
assert(vals.searchSuggestions.some(item=>item.name==='박서이'&&item.href==='models/bakseoi.html?preview=1#model-browse'));
vals.searchRelax();assert.equal(app.state.q,'박');assert.equal(app.state.yearSel,'all');assert.equal(app.state.searchVideo,false);assert.equal(app.state.show,12);
assert(app.vals().results.length>0);assert.equal(app.vals().searchRelaxShow,'none');
app.state.show=36;extraOpen=true;const snapshot=app.rememberList();assert(snapshot);assert(!('D'in snapshot.values));
assert.equal(memory.restore(snapshot,app.listURL()).values.show,36);
assert.equal(memory.restore(snapshot,'/wrong'),null);
assert.equal(memory.restore({...snapshot,version:2},app.listURL()),null);
const bad=structuredClone(snapshot);bad.values.show=Infinity;bad.values.q={bad:true};bad.focus='arbitrary selector';
const safe=memory.restore(bad,app.listURL());assert(!('show'in safe.values));assert(!('q'in safe.values));assert.equal(safe.focus,'');
app.state.show=12;app.state.q='';window.scrollY=0;app.restoreHistoryList();assert.equal(app.state.show,36);assert.equal(app.state.q,'박');
app.restoreListDOM();frames.shift()();assert.equal(scroll,840);assert.equal(focused,'catalogue-query');assert(extraOpen);
let replacements=0;const replace=history.replaceState;history.replaceState=function(...args){replacements++;return replace.apply(this,args);};
app.vals();app.vals();assert.equal(replacements,0,'unchanged URL does not repeat history.replaceState');
const oldWeek=app.weekWorks(0);assert.equal(app.weekWorks(0),oldWeek,'ranking calculations are reused');
const updated=structuredClone(data);updated.weeks[0].ranking.reverse();app.apply(updated);assert.notEqual(app.weekWorks(0),oldWeek,'catalogue updates invalidate cached calculations');
const expected=updated.weeks[0].ranking.filter(id=>updated.works[id]&&app.pubOk(id,0));assert.deepEqual(plain(app.weekWorks(0).map(item=>item.id)),expected);
const original=data.works['2393'].title;assert.equal(original,JSON.parse(fs.readFileSync(path.join(root,'data.json'),'utf8')).works['2393'].title);
console.log(JSON.stringify({result:'PASS',scenarios:['partial/exact/Unicode model matching','public-only counts and collaborations','date rollover','six suggestions at most','preview links','empty search preserves query while relaxing filters','history restores filters/expanded cards/scroll/focus','invalid saved state ignored','unchanged URL avoids repeated history updates','catalogue unchanged']}));
