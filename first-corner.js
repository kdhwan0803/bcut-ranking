/* BCUT home first-corner rotation. UI-free, dependency-free browser module. */
(function (root, factory) {
  var api = factory(root || {});
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.window === root) root.BCUTFirstCorner = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function (root) {
  'use strict';

  var SESSION_KEY = 'bcut_first_corner_session_v1';
  var BAG_KEY = 'bcut_first_corner_bag_v1';
  var TTL = 30 * 60 * 1000;
  var cached = null;
  var listenersBound = false;
  var lastSavedAt = 0;

  function finiteInt(value) {
    return typeof value === 'number' && Number.isFinite(value) && Math.floor(value) === value;
  }
  function safeStore(name) { try { return root[name] || null; } catch (_) { return null; } }
  function readJSON(store, key) {
    try { var raw = store && store.getItem(key); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }
  function writeJSON(store, key, value) { try { if (store) store.setItem(key, JSON.stringify(value)); } catch (_) {} }
  function readable(store, key) { try { if (!store) return false; store.getItem(key); return true; } catch (_) { return false; } }
  function prng(seed) {
    var state = (seed >>> 0) || 0x6d2b79f5;
    return function () { state = (state + 0x6d2b79f5) >>> 0; var t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(values, seed) {
    var out = values.slice(), random = prng(seed);
    for (var i = out.length - 1; i > 0; i--) { var j = Math.floor(random() * (i + 1)), x = out[i]; out[i] = out[j]; out[j] = x; }
    return out;
  }
  function seedNow() {
    try {
      var a = new Uint32Array(1); if (root.crypto && root.crypto.getRandomValues) { root.crypto.getRandomValues(a); return a[0] | 0; }
    } catch (_) {}
    return ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0);
  }
  function validRecord(value) {
    return value && value.v === 1 && ['ranking', 'discovery', 'new', 'model'].indexOf(value.kind) >= 0 && finiteInt(value.seed) && typeof value.lastActivity === 'number' && Number.isFinite(value.lastActivity);
  }
  var pendingNewVisit = false;
  function touch(force) {
    if (!cached || pendingNewVisit) return;
    var now = Date.now();
    // A lifecycle event is not activity: an idle tab must not renew an expired visit
    // just before reload. Keep this document stable and rotate on its next load.
    if (now - cached.lastActivity > TTL) { pendingNewVisit = true; return; }
    if (!force) cached.lastActivity = now;
    if (force || now - lastSavedAt >= 30000) { writeJSON(safeStore('sessionStorage'), SESSION_KEY, cached); lastSavedAt = now; }
  }
  function bindActivity() {
    if (listenersBound || !root.document || !root.addEventListener) return;
    listenersBound = true;
    ['pointerdown', 'keydown', 'scroll'].forEach(function (event) { try { root.addEventListener(event, function () { touch(false); }, { passive: true }); } catch (_) { try { root.addEventListener(event, function () { touch(false); }); } catch (__) {} } });
    ['visibilitychange', 'pagehide'].forEach(function (event) { try { root.addEventListener(event, function () { touch(true); }, { passive: true }); } catch (_) { try { root.addEventListener(event, function () { touch(true); }); } catch (__) {} } });
  }
  function validBag(state) {
    if (!state || state.v !== 1 || !Array.isArray(state.bag) || state.bag.length > 6 || (state.last != null && ['ranking', 'discovery', 'new', 'model'].indexOf(state.last) < 0)) return false;
    var counts = { ranking: 0, discovery: 0, new: 0, model: 0 };
    for (var i = 0; i < state.bag.length; i++) { if (!Object.prototype.hasOwnProperty.call(counts, state.bag[i])) return false; counts[state.bag[i]]++; }
    return counts.ranking <= 3 && counts.discovery <= 1 && counts.new <= 1 && counts.model <= 1;
  }
  function noRepeat(bag, previous) { for (var i = 0, before = previous || null; i < bag.length; i++) { if (bag[i] === before) return false; before = bag[i]; } return true; }
  function newBag(previous, seed) {
    var random = prng(seed), wantRanking = random() < 0.5, entries = ['ranking', 'ranking', 'ranking', 'discovery', 'new', 'model'];
    // Rejection gives a seeded constrained shuffle rather than a fixed alternating pattern.
    for (var attempt = 0; attempt < 48; attempt++) {
      var bag = shuffle(entries, (seed + Math.imul(attempt + 1, 0x9e3779b9)) | 0);
      if ((bag[0] === 'ranking') === wantRanking && noRepeat(bag, previous)) return bag;
    }
    // A conflict with the preceding bag can make the requested start impossible.
    var other = shuffle(['discovery', 'new', 'model'], seed ^ 0x51ed270b), r = 'ranking';
    if (wantRanking && previous !== r) return [r, other[0], r, other[1], r, other[2]];
    if (previous && previous !== r && other[0] === previous) { var swap = other.findIndex(function (x) { return x !== previous; }); if (swap > 0) { var x = other[0]; other[0] = other[swap]; other[swap] = x; } }
    return [other[0], r, other[1], r, other[2], r];
  }
  function nextKind(seed) {
    var store = safeStore('localStorage');
    if (!readable(store, BAG_KEY)) return 'ranking';
    var state = readJSON(store, BAG_KEY);
    if (!validBag(state)) state = { v: 1, bag: [], last: null };
    if (!state.bag.length) state.bag = newBag(state.last, seed);
    var kind = state.bag.shift();
    state.last = kind;
    writeJSON(store, BAG_KEY, state);
    return kind || 'ranking';
  }

  function recordView() {
    var result={kind:cached.kind,seed:cached.seed,themeSlot:cached.themeSlot};
    if(finiteInt(cached.refreshDraw)&&cached.refreshDraw>0){result.refreshDraw=cached.refreshDraw;result.avoidIds=Array.isArray(cached.avoidIds)?cached.avoidIds.slice():[];}
    return result;
  }
  function isReload(){try{var entry=root.performance&&root.performance.getEntriesByType&&root.performance.getEntriesByType('navigation')[0];return entry?entry.type==='reload':!!(root.performance&&root.performance.navigation&&root.performance.navigation.type===1);}catch(_){return false;}}
  function refresh(){
    if(!cached)resolve();
    var now=Date.now(),draw=finiteInt(cached.refreshDraw)?cached.refreshDraw+1:1;
    cached=Object.assign({},cached,{kind:'discovery',seed:seedNow()^draw,themeSlot:slotOf(now),refreshDraw:draw,avoidIds:Array.isArray(cached.shownIds)?cached.shownIds.map(String).slice(0,3):[],lastActivity:now});
    pendingNewVisit=false;writeJSON(safeStore('sessionStorage'),SESSION_KEY,cached);lastSavedAt=now;return recordView();
  }
  function remember(plan){if(!cached||!plan||!Array.isArray(plan.ids)||plan.ids.length!==3)return;cached.shownIds=plan.ids.map(String);writeJSON(safeStore('sessionStorage'),SESSION_KEY,cached);}

  function resolve() {
    bindActivity();
    if (cached) return recordView();
    var now = Date.now(), session = safeStore('sessionStorage'), stored = readable(session, SESSION_KEY) ? readJSON(session, SESSION_KEY) : null;
    if (validRecord(stored) && now - stored.lastActivity >= 0 && now - stored.lastActivity <= TTL) { cached = stored; if (!finiteInt(cached.themeSlot) || cached.themeSlot < 0) cached.themeSlot = slotOf(now); lastSavedAt = stored.lastActivity; touch(); writeJSON(session, SESSION_KEY, cached); lastSavedAt = now; }
    else {
      var seed = seedNow();
      cached = { v: 1, kind: readable(session, SESSION_KEY) ? nextKind(seed) : 'ranking', seed: seed, themeSlot: slotOf(now), lastActivity: now };
      writeJSON(session, SESSION_KEY, cached); lastSavedAt = now;
    }
    if(isReload())return refresh();
    return recordView();
  }

  // Verified public concepts and official product facts only. No inferred exposure scores.
  // Fixed work sets avoid paired editions and keep neighboring themes free of repeat works.
  var THEMES = [
  {
    "id": "bunny-three",
    "title": "서로 다른 세 가지 바니",
    "subtitle": "공식 소개와 대표 이미지로 확인한 바니 콘셉트 3선",
    "rule": "curated",
    "items": [
      {
        "id": "1485",
        "reason": "블랙 바니 콘셉트의 사진·영상판"
      },
      {
        "id": "1704",
        "reason": "바니와 캣을 결합한 옐랑의 콘셉트 작품"
      },
      {
        "id": "2215",
        "reason": "바니걸 콘셉트로 소개된 히나의 작품"
      }
    ]
  },
  {
    "id": "coin-100",
    "title": "100코인 이하로 고르기",
    "subtitle": "개별 구매 가격 기준 · 구독 열람 여부는 작품 정보에서 확인",
    "rule": "budget",
    "items": [
      {
        "id": "2431"
      },
      {
        "id": "1396"
      },
      {
        "id": "1837"
      }
    ]
  },
  {
    "id": "maid-three",
    "title": "세 모델의 메이드 콘셉트",
    "subtitle": "각기 다른 모델과 시리즈로 만나는 메이드 3선",
    "rule": "curated",
    "items": [
      {
        "id": "1651",
        "reason": "츤데레 메이드의 사진·영상판"
      },
      {
        "id": "1713",
        "reason": "고양이와 메이드 콘셉트를 결합한 작품"
      },
      {
        "id": "2395",
        "reason": "일과 후 메이드 콘셉트의 사진·영상판"
      }
    ]
  },
  {
    "id": "photo-video",
    "title": "사진과 영상을 한 번에",
    "subtitle": "사진·영상이 함께 포함된 단일 상품 3편 · 사진 p는 표지 포함",
    "rule": "mixed",
    "items": [
      {
        "id": "2396"
      },
      {
        "id": "2436"
      },
      {
        "id": "2417"
      }
    ]
  },
  {
    "id": "black-three",
    "title": "블랙룩, 서로 다른 세 가지",
    "subtitle": "블랙 의상을 중심으로 고른 서로 다른 모델의 3편",
    "rule": "curated",
    "items": [
      {
        "id": "1430",
        "reason": "Black 시리즈의 사진·영상판"
      },
      {
        "id": "1342",
        "reason": "블랙 비키니 콘셉트의 작품"
      },
      {
        "id": "1907",
        "reason": "블랙 수트 콘셉트의 작품"
      }
    ]
  },
  {
    "id": "photo-100",
    "title": "사진 100장 이상, 넉넉하게",
    "subtitle": "공식 목록상 사진 100장 이상인 작품 3편 · 사진 p는 표지 포함",
    "rule": "photos",
    "items": [
      {
        "id": "2495"
      },
      {
        "id": "2455"
      },
      {
        "id": "2489"
      }
    ]
  },
  {
    "id": "video-short",
    "title": "영상 합계 5분 이하로 골라보기",
    "subtitle": "공개된 영상 구성 정보 기준 · 실제 재생 검토나 감상 시간 보장은 아닙니다",
    "rule": "short",
    "items": [
      {
        "id": "1894"
      },
      {
        "id": "2348"
      },
      {
        "id": "2490"
      }
    ]
  },
  {
    "id": "video-long",
    "title": "영상 합계 10분 이상으로",
    "subtitle": "공개된 영상 구성 정보 기준 · 작품마다 사진·영상 구성은 다릅니다",
    "rule": "long",
    "items": [
      {
        "id": "1966"
      },
      {
        "id": "2374"
      },
      {
        "id": "2437"
      }
    ]
  },
  {
    "id": "archive-three",
    "title": "신작 사이, 이전 작품도",
    "subtitle": "2026년 상반기까지 공개된 서로 다른 모델의 작품 3편",
    "rule": "archive",
    "items": [
      {
        "id": "239"
      },
      {
        "id": "978"
      },
      {
        "id": "1217"
      }
    ]
  }
].map(function (theme) {
    theme.items = Object.freeze(theme.items.map(function (item) { return Object.freeze(item); }));
    return Object.freeze(theme);
  });
  Object.freeze(THEMES);
  var SLOT_MS = 8 * 60 * 60 * 1000;
  function slotOf(now) {
    var time = now == null ? Date.now() : new Date(now).getTime();
    if (!Number.isFinite(time)) time = Date.now();
    return Math.floor((time + 9 * 60 * 60 * 1000) / SLOT_MS);
  }
  function number(value) { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
  function themeAccepts(theme, work, fact) {
    if (theme.rule === 'curated') return true;
    if (!fact || typeof fact !== 'object') return false;
    if (theme.rule === 'budget') return number(fact.coin) && fact.coin <= 100;
    if (theme.rule === 'mixed') return number(fact.photos) && fact.photos >= 10 && number(fact.videos) && work.vid === 1 && !/VIDEO\s*ONLY|\(VIDEO\)/i.test(work.title || '');
    if (theme.rule === 'photos') return number(fact.photos) && fact.photos >= 100;
    if (theme.rule === 'short') return work.vid === 1 && number(fact.videos) && number(fact.seconds) && fact.seconds <= 300;
    if (theme.rule === 'long') return work.vid === 1 && number(fact.videos) && number(fact.seconds) && fact.seconds >= 600;
    if (theme.rule === 'archive') return work.pub <= '2026-06-30';
    return false;
  }
  function videoLength(seconds) { return Math.floor(seconds / 60) + '분 ' + String(seconds % 60).padStart(2, '0') + '초'; }
  function themeReason(theme, item, work, fact) {
    if (theme.rule === 'curated') return item.reason;
    if (theme.rule === 'budget') return '개별 구매 ' + fact.coin + '코인';
    if (theme.rule === 'mixed') return (number(fact.photoPages) ? '사진 ' + fact.photoPages + 'p' : '목록상 사진 ' + fact.photos + '장') + ' · 영상 ' + fact.videos + '편';
    if (theme.rule === 'photos') return number(fact.photoPages) ? '사진 ' + fact.photoPages + 'p · 표지 포함' : '목록상 사진 ' + fact.photos + '장';
    if (theme.rule === 'short' || theme.rule === 'long') return '영상 ' + fact.videos + '편 · 합계 ' + videoLength(fact.seconds);
    if (theme.rule === 'archive') return work.pub.slice(0, 7).replace('-', '년 ') + '월 공개';
    return '';
  }
  function thematicPlan(works, liveSet, record, options) {
    var facts = options.facts && options.facts.works ? options.facts.works : {};
    var slot = record && finiteInt(record.themeSlot) && record.themeSlot >= 0 ? record.themeSlot : slotOf(options.now);
    // Shift the order each complete cycle, so one theme is not stuck in one time of day.
    var offset = ((slot % THEMES.length) + (Math.floor(slot / THEMES.length) % THEMES.length)) % THEMES.length;
    for (var step = 0; step < THEMES.length; step++) {
      var draw=record&&finiteInt(record.refreshDraw)?record.refreshDraw:0;
      var theme = THEMES[(offset + draw + step) % THEMES.length];
      if(record&&Array.isArray(record.avoidIds)&&theme.items.some(function(item){return record.avoidIds.indexOf(item.id)>=0;}))continue;
      if (!theme.items.every(function (item) { return liveSet.has(item.id) && themeAccepts(theme, works[item.id], facts[item.id]); })) continue;
      var reasons = Object.create(null);
      theme.items.forEach(function (item) { reasons[item.id] = themeReason(theme, item, works[item.id], facts[item.id]); });
      return { kind: 'discovery', title: theme.title, subtitle: theme.subtitle, ids: theme.items.map(function (item) { return item.id; }), themeId: theme.id, themeSlot: slot, reasons: reasons };
    }
    return null;
  }

  function todayKST(now) {
    var date = new Date(now == null ? Date.now() : now);
    if (!Number.isFinite(date.getTime())) date = new Date(Date.now());
    try {
      var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date), bits = {};
      parts.forEach(function (part) { bits[part.type] = part.value; });
      return bits.year + '-' + bits.month + '-' + bits.day;
    } catch (_) { return new Date(date.getTime()+9*3600000).toISOString().slice(0,10); }
  }
  function strictDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = new Date(value + 'T00:00:00Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function released(work, today) {
    if (!work || typeof work !== 'object' || !strictDate(work.pub) || work.pub > today) return false;
    if (work.hidden === true || work.draft === true || work.deleted === true || work.unpublished === true || work.published === false) return false;
    return !/^(draft|hidden|deleted|unpublished)$/i.test(String(work.status || '').trim());
  }
  function normalizeModel(value) {
    if (typeof value !== 'string') return '';
    return value.normalize ? value.normalize('NFKC').replace(/\s+/g, ' ').trim() : value.replace(/\s+/g, ' ').trim();
  }
  function idsOf(value) { return Array.isArray(value) ? value : (value == null ? [] : [value]); }
  function catalogue(data, today) {
    var works = data && data.works && typeof data.works === 'object' ? data.works : {};
    return Object.keys(works).filter(function (id) { return released(works[id], today); });
  }
  function byNewest(works, ids) {
    return ids.slice().sort(function (a, b) { var da = works[a].pub, db = works[b].pub; return db.localeCompare(da) || String(b).localeCompare(String(a), undefined, { numeric: true }); });
  }
  function plan(data, record, options) {
    options = options || {};
    var works = data && data.works && typeof data.works === 'object' ? data.works : {};
    var today = todayKST(options.now), seed = record && finiteInt(record.seed) ? record.seed : 0;
    var kind = record && ['ranking', 'discovery', 'new', 'model'].indexOf(record.kind) >= 0 ? record.kind : 'ranking';
    var live = catalogue(data, today), liveSet = new Set(live);
    var meta = {
      ranking: ['주간 랭킹', '구매 수 기준 주간 랭킹'],
      discovery: ['추천 화보', '지금 둘러보기 좋은 화보'],
      new: ['새로 공개된 화보', '최신 공개작 3선'],
      model: ['모델 스포트라이트', '한 모델의 공개 화보 3선']
    };
    function ranking() { return { kind: 'ranking', title: meta.ranking[0], subtitle: meta.ranking[1], ids: [] }; }
    if (kind === 'ranking') return ranking();
    var ids = [];
    if (kind === 'discovery') {
      var themed = thematicPlan(works, liveSet, record, options);
      if (themed) return themed;
      var seen = new Set(),avoid=new Set(record&&Array.isArray(record.avoidIds)?record.avoidIds:[]);
      ids = shuffle(idsOf(options.recommendationIds).map(String).filter(function (id) { if (seen.has(id) || avoid.has(id) || !liveSet.has(id)) return false; seen.add(id); return true; }), seed ^ 0x7f4a7c15).slice(0, 3);
      if(ids.length<3&&record&&record.refreshDraw){var usedModels=new Set();ids.forEach(function(id){usedModels.add(normalizeModel(idsOf(works[id].models)[0]));});shuffle(live,seed).forEach(function(id){if(ids.length>=3||avoid.has(id)||ids.indexOf(id)>=0)return;var model=normalizeModel(idsOf(works[id].models)[0]);if(model&&usedModels.has(model))return;ids.push(id);if(model)usedModels.add(model);});}
    } else if (kind === 'new') {
      ids = byNewest(works, live).slice(0, 3);
    } else {
      var groups = Object.create(null);
      live.forEach(function (id) { idsOf(works[id].models).forEach(function (raw) { var name = normalizeModel(raw); if (name) (groups[name] || (groups[name] = [])).push(id); }); });
      var names = Object.keys(groups).filter(function (name) { return new Set(groups[name]).size >= 3; }).sort();
      if (names.length) {
        var model = names[Math.floor(prng(seed)() * names.length)];
        ids = shuffle(byNewest(works, Array.from(new Set(groups[model]))), seed ^ 0x51ed270b).slice(0, 3);
        if (ids.length === 3) return { kind: 'model', title: meta.model[0], subtitle: meta.model[1], model: model, ids: ids };
      }
    }
    if (ids.length !== 3) return ranking();
    return { kind: kind, title: meta[kind][0], subtitle: meta[kind][1], ids: ids };
  }

  return Object.freeze({ resolve: resolve, refresh: refresh, remember: remember, plan: plan, slotOf: slotOf, themes: THEMES });
}));
