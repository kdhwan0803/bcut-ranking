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
  function resolve() {
    bindActivity();
    if (cached) return { kind: cached.kind, seed: cached.seed };
    var now = Date.now(), session = safeStore('sessionStorage'), stored = readable(session, SESSION_KEY) ? readJSON(session, SESSION_KEY) : null;
    if (validRecord(stored) && now - stored.lastActivity >= 0 && now - stored.lastActivity <= TTL) { cached = stored; lastSavedAt = stored.lastActivity; touch(); }
    else {
      var seed = seedNow();
      cached = { v: 1, kind: readable(session, SESSION_KEY) ? nextKind(seed) : 'ranking', seed: seed, lastActivity: now };
      writeJSON(session, SESSION_KEY, cached); lastSavedAt = now;
    }
    return { kind: cached.kind, seed: cached.seed };
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
      var seen = new Set();
      ids = shuffle(idsOf(options.recommendationIds).map(String).filter(function (id) { if (seen.has(id) || !liveSet.has(id)) return false; seen.add(id); return true; }), seed ^ 0x7f4a7c15).slice(0, 3);
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

  return Object.freeze({ resolve: resolve, plan: plan });
}));
