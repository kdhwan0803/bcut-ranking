const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const api = require('../model-page-data.js');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data.json'), 'utf8'));
const arg = process.argv.indexOf('--date'), date = arg < 0 ? api.today() : process.argv[arg + 1];
const mapping = JSON.parse(html.match(/<script id="work-model-links" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const document = { getElementById: () => ({ textContent: JSON.stringify(mapping) }), body:{style:{}} };
const window = {};
const events=[];
const context = vm.createContext({ window, document, console, Date, URLSearchParams, track:(name,params)=>events.push({name,params:plain(params)}),location: {search:'?preview=1',pathname:'/',hash:''}, history:{replaceState(){},pushState(){}}, localStorage:{getItem(){return null;},setItem(){}}, DCLogic:class {constructor(){this.props={};} setState(patch){Object.assign(this.state,patch);}} });
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
vm.runInContext(inline.find(code => code.includes('window.BCUTCatalogueUI =')), context);
vm.runInContext(inline.find(code => code.includes('window.BCUTSearch=')), context);
const ui = window.BCUTCatalogueUI;
const plain = value => JSON.parse(JSON.stringify(value));
const fixture = {works:{
  1:{models:['A','B'],pub:'2026-10-01'},
  2:{models:['A'],pub:'2026-10-02'},
  3:{models:['A','B'],pub:'2026-10-10'},
  4:{models:['B'],pub:'2026-10-10'},
  5:{models:['A'],pub:'2026-10-11'},
  6:{models:['A'],pub:'2026-02-30'},
  7:{models:['A'],pub:'2026-10-10',hidden:true},
  8:{models:['A'],pub:'2026-10-10',published:false},
  9:{models:['A'],pub:'2026-10-10',status:'draft'},
  10:{models:['C'],pub:'2026-10-10'},
  11:{models:"[' B ']",pub:'2026-10-03'}
}};
const before = JSON.stringify(fixture);
assert.deepEqual(plain(ui.related(fixture,'1','2026-10-10')),['4','3','11','2']);
assert.deepEqual(plain(ui.related(fixture,'10','2026-10-10')),[]);
assert.deepEqual(plain(ui.modelNames([' A ','A','B',''])),['A','B']);
assert.equal(JSON.stringify(fixture),before);
for (const work of Object.values(data.works)) assert.equal(ui.released(work,date),api.listed(work)&&work.pub<=date);
for (const [name,slug] of Object.entries(mapping)) {
  assert(/^[a-z0-9_-]+$/.test(slug)); assert(fs.existsSync(path.join(root,'models',slug+'.html')));
  const link=ui.modelLinks([name])[0]; assert.equal(link.href,'models/'+slug+'.html'+(['donggeuran','seuli','bakseoi'].includes(slug)?'#model-browse':'#grid'));
}
assert(ui.modelLinks(['없는 모델'])[0].href.includes('model='));
const entry=ui.browseEntry('?w=2393&mb_model=bakseoi&mb_format=video&mb_sort=popular');
assert.deepEqual(plain(entry),{model:'박서이',model_slug:'bakseoi',work_id:'2393',browse_format:'video',browse_sort:'popular'});
for(const query of ['?w=2393&mb_model=bad&mb_format=all&mb_sort=latest','?w=bad&mb_model=bakseoi&mb_format=all&mb_sort=latest','?w=2393&mb_model=bakseoi&mb_format=bad&mb_sort=latest','?w=2393&mb_model=bakseoi&mb_format=all&mb_sort=bad']) assert.equal(ui.browseEntry(query),null);
const source=html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
vm.runInContext(source+'\nthis.App=Component;',context);
const checked=[];
for (const [id,model] of [['2393','박서이'],['2055','동그란'],['2274','슬이']]) {
  const app=new context.App();
  Object.assign(app.state,{D:structuredClone(data),wi:data.weeks.length-1,now:Date.parse(date+'T07:00:00Z'),age:'adult',view:'search',modal:{kind:'work',id}});
  const modal=app.vals().modal, expected=api.summary(data,model,date).published.filter(other=>other!==id).slice(0,8);
  assert.deepEqual(plain(modal.relatedCards.map(card=>card.id)),expected);
  assert(modal.modelLinks.some(link=>link.name===model));
  assert.equal(modal.gridShow,'none');
  assert.equal(modal.relatedShow,'block');
  assert(modal.relatedCards.every(card=>card.title&&card.date&&card.href==='?w='+card.id));
  assert(modal.relatedCards.every(card=>card.kind===(data.works[card.id].vid===true||String(data.works[card.id].vid)==='1'?'영상 포함':'사진')));
  let opened,prevented=false; app.openWork=value=>{opened=value;};
  const card=modal.relatedCards[0];
  card.open({button:0,preventDefault(){prevented=true;}}); assert.equal(opened,card.id); assert(prevented);
  opened=null; prevented=false; card.open({button:0,ctrlKey:true,preventDefault(){prevented=true;}}); assert.equal(opened,null); assert(!prevented);
  assert.equal(modal.cta,'https://bcut.maximkorea.net/work/'+id);
  checked.push({id,model,related:expected.length});
}
const attribution=new context.App(); attribution.state.D=data; attribution.hit=()=>{};
attribution.openWork('2393',null,entry);
attribution.vals().modal.trackOutbound();
assert.equal(events.length,1); assert.equal(events[0].name,'go_bcut'); assert.equal(events[0].params.browse_sort,'popular');
assert.equal(events[0].params.link_origin,'work_detail'); assert.equal(events[0].params.work_id,'2393');
attribution.openWork('2055',null,entry); assert.equal(attribution.state.modal.browse,null);
attribution.openWork('2393'); assert.equal(attribution.state.modal.browse,null);
assert.equal(events.length,1,'unrelated detail opens do not inherit the list attribution');
assert(html.includes('class="work-related-card" data-work-id="{{ o.id }}" href="{{ o.href }}"'));
assert(html.includes('<time datetime="{{ o.date }}">'));
console.log(JSON.stringify({result:'PASS',checked,modelLinks:Object.keys(mapping).length,scenarios:['published only','exclude current work','latest/date ties','collaboration deduplication','empty results','model page mappings','real detail render and destinations','keyboard/native modified links','catalogue unchanged']}));
