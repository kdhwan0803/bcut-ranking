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
const document = { getElementById: () => ({ textContent: JSON.stringify(mapping) }), createElement: () => ({style:{}}), head:{appendChild(){}}, body:{style:{}} };
const window = {};
const events=[];
const context = vm.createContext({ window, document, console, Date, URLSearchParams, track:(name,params)=>events.push({name,params:plain(params)}),location: {search:'?preview=1',pathname:'/',hash:''}, history:{replaceState(){},pushState(){}}, localStorage:{getItem(){return null;},setItem(){}}, DCLogic:class {constructor(){this.props={};} setState(patch){Object.assign(this.state,patch);}} });
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
vm.runInContext(fs.readFileSync(path.join(root, 'paid-pick-rotation.js'), 'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root, 'work-facts.js'), 'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(root, 'work-shopping.js'), 'utf8'),context);
vm.runInContext(inline.find(code => code.includes('window.BCUTCatalogueUI =')), context);
vm.runInContext(inline.find(code => code.includes('window.BCUTSearch=')), context);
const ui = window.BCUTCatalogueUI;
const shopping = window.BCUTShopping;
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
const shoppingFixture={works:{
  current:{models:['A'],photo:'creator-a',pub:'2026-10-10',title:'Set (PHOTO)'},
  counterpart:{models:['A'],photo:'creator-a',pub:'2026-10-10',title:'Set (VIDEO)'},
  modelNew:{models:['A'],photo:'other-1',pub:'2026-10-14',title:'Model new (PHOTO)'},
  modelNext:{models:['A'],photo:'other-2',pub:'2026-10-13',title:'Model next (PHOTO)'},
  modelExtra:{models:['A'],photo:'other-3',pub:'2026-10-12',title:'Model extra (PHOTO)'},
  creatorNew:{models:['B'],photo:'creator-a',pub:'2026-10-14',title:'Creator new (PHOTO)'},
  creatorNext:{models:['C'],photo:'creator-a',pub:'2026-10-13',title:'Creator next (PHOTO)'},
  hidden:{models:['A'],photo:'creator-a',pub:'2026-10-15',hidden:true,title:'Hidden (PHOTO)'},
  draft:{models:['A'],photo:'creator-a',pub:'2026-10-15',status:'draft',title:'Draft (PHOTO)'},
  invalid:{models:['A'],photo:'creator-a',pub:'2026-02-30',title:'Invalid date (PHOTO)'},
  future:{models:['A'],photo:'creator-a',pub:'2026-10-16',title:'Future (PHOTO)'}
}};
const shoppingBefore=JSON.stringify(shoppingFixture);
const recommendations=plain(shopping.recommendations(shoppingFixture,'current','2026-10-15'));
assert.deepEqual(recommendations,[
  {id:'modelNew',reason:'같은 모델'},{id:'modelNext',reason:'같은 모델'},
  {id:'creatorNew',reason:'같은 작가'},{id:'creatorNext',reason:'같은 작가'}
],'recommendations are four unique released works, prioritising model then creator');
assert(recommendations.length<=4&&new Set(recommendations.map(item=>item.id)).size===recommendations.length);
for(const excluded of ['current','counterpart','modelExtra','hidden','draft','invalid','future']) assert(!recommendations.some(item=>item.id===excluded),'excluded recommendation: '+excluded);
assert.equal(JSON.stringify(shoppingFixture),shoppingBefore,'recommendation selection must not mutate its input');
const ineligibleOnly={works:{
  current:{models:['A'],photo:'creator-a',pub:'2026-10-10',title:'Current'},
  hidden:{models:['A'],photo:'creator-b',pub:'2026-10-15',hidden:true,title:'Hidden'},
  draft:{models:['A'],photo:'creator-b',pub:'2026-10-15',status:'draft',title:'Draft'},
  invalid:{models:['A'],photo:'creator-b',pub:'2026-02-30',title:'Invalid'},
  future:{models:['A'],photo:'creator-b',pub:'2026-10-16',title:'Future'}
}};
assert.deepEqual(plain(shopping.recommendations(ineligibleOnly,'current','2026-10-15')),[],'hidden, draft, invalid-date and future works are never eligible');
assert.deepEqual(plain(shopping.editions(shoppingFixture,'current','2026-10-15')),[

  {id:'current',kind:'photo',current:true,label:'사진판 · 현재 선택'},
  {id:'counterpart',kind:'video',current:false,label:'영상판 보기'}
],'PHOTO/VIDEO-only editions are paired and labelled');
assert.equal(shopping.editionKind(shoppingFixture.works.current),'photo');
assert.equal(shopping.editionKind(shoppingFixture.works.counterpart),'video');
const photoPurchase=shopping.purchase('2392',data,false,null,'사진 화보');
const videoPurchase=shopping.purchase('2393',data,false,null,'영상 화보');
assert.equal(photoPurchase.price,'200코인'); assert.equal(photoPurchase.format,'사진 화보');
assert.equal(videoPurchase.price,'200코인'); assert.equal(videoPurchase.format,'영상 화보');
assert.match(shopping.summary('2392',data),/내지 사진 128장/,'known official photo metadata is exposed');
for (const work of Object.values(data.works)) assert.equal(ui.released(work,date),api.listed(work)&&work.pub<=date);
for (const [name,slug] of Object.entries(mapping)) {
  assert(/^[a-z0-9_-]+$/.test(slug)); assert(fs.existsSync(path.join(root,'models',slug+'.html')));
  const link=ui.modelLinks([name])[0]; assert.equal(link.href,'models/'+slug+'.html?preview=1'+(['donggeuran','seuli','bakseoi','jyu'].includes(slug)?'#model-browse':'#grid'));
}
assert(ui.modelLinks(['없는 모델'])[0].href.includes('model='));
assert.equal(ui.previewLink('?w=2393'),'?w=2393&preview=1');
context.location.search='?admin=1&measure=1'; assert.equal(ui.previewLink('models/bakseoi.html#model-browse'),'models/bakseoi.html?admin=1&measure=1#model-browse');
context.location.search=''; assert.equal(ui.modelLinks(['박서이'])[0].href,'models/bakseoi.html#model-browse'); assert.equal(ui.previewLink('?w=2393'),'?w=2393');
context.location.search='?preview=1';
const entry=ui.browseEntry('?w=2393&mb_model=bakseoi&mb_format=video&mb_sort=popular');
assert.deepEqual(plain(entry),{model:'박서이',model_slug:'bakseoi',work_id:'2393',browse_format:'video',browse_sort:'popular'});
for(const query of ['?w=2393&mb_model=bad&mb_format=all&mb_sort=latest','?w=bad&mb_model=bakseoi&mb_format=all&mb_sort=latest','?w=2393&mb_model=bakseoi&mb_format=bad&mb_sort=latest','?w=2393&mb_model=bakseoi&mb_format=all&mb_sort=bad']) assert.equal(ui.browseEntry(query),null);
const source=html.match(/<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/)[1];
vm.runInContext(source+'\nthis.App=Component;',context);
// The wall clock deliberately disagrees with state.now: --date must reach the UI.
const RealDate=context.Date;
context.Date=class extends RealDate {
  constructor(...args){super(...(args.length?args:['2000-01-01T00:00:00Z']));}
  static now(){return RealDate.parse('2000-01-01T00:00:00Z');}
};
const releaseData=structuredClone(data);
assert(!releaseData.works['900001'],'Synthetic release ID must not replace catalogue data');
releaseData.works['900001']={...releaseData.works['2424'],title:'Release boundary fixture',pub:'2026-10-16'};
const releaseBefore=JSON.stringify(releaseData);
const releaseApp=new context.App();
Object.assign(releaseApp.state,{D:releaseData,wi:releaseData.weeks.length-1,age:'adult',view:'search',modal:{kind:'work',id:'2274'},now:Date.parse('2026-10-14T14:59:59.998Z')});
const releaseChecks=[];
for(const [instant,day,originalReleased,addedReleased] of [
  ['2026-10-14T14:59:59.999Z','2026-10-14',false,false],
  ['2026-10-14T15:00:00.000Z','2026-10-15',true,false],
  ['2026-10-15T14:59:59.999Z','2026-10-15',true,false],
  ['2026-10-15T15:00:00.000Z','2026-10-16',true,true]
]){
  releaseApp.tickClock(Date.parse(instant));
  assert.equal(releaseApp.today(),day,'UI follows the injected KST day: '+instant);
  const ids=plain(releaseApp.vals().modal.relatedCards.map(card=>card.id));
  assert.equal(ids.includes('2424'),originalReleased,'Existing release at KST midnight');
  assert.equal(ids.includes('900001'),addedReleased,'New catalogue release at KST midnight');
  const model=releaseData.works['2274'].models[0];
  const expectedRelated=plain(shopping.recommendations(releaseData,'2274',day).map(item=>item.id));
  assert.deepEqual(ids,expectedRelated,'Modal uses the approved recommendation API at the KST boundary');
  assert(ids.length<=4&&new Set(ids).size===ids.length,'Modal recommendations stay unique and capped at four');
  releaseChecks.push({instant,day,originalReleased,addedReleased});
}
assert.equal(JSON.stringify(releaseData),releaseBefore,'Date rollover must preserve catalogue data');
context.Date=RealDate;
console.log(JSON.stringify({result:'PASS',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,releaseChecks}));
const checked=[];
for (const [id,model] of [['2393','박서이'],['2055','동그란'],['2274','슬이']]) {
  const app=new context.App();
  Object.assign(app.state,{D:structuredClone(data),wi:data.weeks.length-1,now:Date.parse(date+'T07:00:00Z'),age:'adult',view:'search',modal:{kind:'work',id}});
  const modal=app.vals().modal, expected=plain(shopping.recommendations(data,id,date).map(item=>item.id));
  assert.deepEqual(plain(modal.relatedCards.map(card=>card.id)),expected);
  assert(expected.length<=4&&new Set(expected).size===expected.length);
  assert(modal.relatedCards.every(card=>card.reason==='같은 모델'||card.reason==='같은 작가'));
  assert(modal.modelLinks.some(link=>link.name===model));
  assert.equal(modal.gridShow,'none');
  assert.equal(modal.relatedShow,'block');
  assert(modal.relatedCards.every(card=>card.title&&card.date&&card.href==='?w='+card.id+'&preview=1'));
  assert(modal.relatedCards.every(card=>card.kind===ui.format(data.works[card.id])),'Cards distinguish photo-only, video-only and included-video formats');
  assert.equal(modal.simShow,'none'); assert.equal(modal.similar.length,0,'A second recommendation block must not duplicate the four cards');
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
