/* ============================================================
   MAXIM B컷 - 화보 상세페이지 랭킹 배지 + 이벤트 스트립  v3
   bcutrank.com/rank-badge.js

   [상세페이지 최상단]
   <div id="bcut-event" data-id="화보ID"></div>

   [상세페이지 최하단]
   <div id="bcut-rank"></div>
   <script src="https://bcutrank.com/rank-badge.js"></script>

   * script 태그는 하단 하나면 됨
   * data-id 는 생성기에서 자동으로 박아주면 가장 정확함 (없어도 자동 인식 시도)
   * 매주 월요일: WEEK / RANK 교체
   * 세일 걸 때: EVENTS 에 한 덩어리 추가. 끝나면 자동으로 사라짐
   * 확인용: 주소 뒤에 ?bcutdebug=1
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 1. 매주 갱신 ---------- */

  var WEEK = '7월 4주';
  var SITE = 'https://bcutrank.com';

  // { "화보ID": [이번주, 지난주, 2주전] }
  var RANK = {
  "1952": [4, null, null],
  "1953": [5, null, null],
  "1966": [1, null, null],
  "1999": [3, null, null],
  "2011": [2, null, null]
  };

  /* ---------- 2. 이벤트 (여러 개 동시 등록 가능) ----------
     targets: []        -> 전 화보에 노출
     targets: ["123"]   -> 그 화보에만 노출
     start / end        -> "2026-08-01" 또는 "2026-08-01 21:00"
                           날짜만 쓰면 그 날 23:59 까지
     위에 있는 것부터 먼저 매칭 (한 페이지에 하나만 노출)
  ------------------------------------------------------------ */

  var EVENTS = [
    // {
    //   on: true,
    //   targets: ["10023", "10024"],
    //   tag: 'TIME SALE',
    //   title: '오늘 밤 한정 50% 할인',
    //   sub: '자정까지 코인 10개 -> 5개',
    //   url: 'https://bcut.maximkorea.net/...',
    //   start: '2026-08-01 21:00',
    //   end: '2026-08-01 23:59'
    // },
    // {
    //   on: true,
    //   targets: [],
    //   tag: 'EVENT',
    //   title: '이상형 월드컵 오픈',
    //   sub: '내 최애 화보 뽑고 결과 공유하기',
    //   url: 'https://bcutrank.com/worldcup.html',
    //   start: '2026-07-29',
    //   end: '2026-08-11'
    // }
  ];

  /* ---------- 3. 아래는 건드릴 일 없음 ---------- */

  var DEBUG = /[?&]bcutdebug=1/.test(location.search);
  var GOLD = '#c9a227';
  var RED = '#e0483c';
  var INK = '#0c0c0d';
  var FONT = 'Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[bcut-rank]'].concat([].slice.call(arguments)));
  }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function css(el, o) { for (var k in o) el.style[k] = o[k]; }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // "2026-08-01" 또는 "2026-08-01 21:00"
  function parseDT(s, endOfDay) {
    if (!s) return null;
    var m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
    if (!m) return null;
    var hasTime = m[4] !== undefined;
    return new Date(
      +m[1], +m[2] - 1, +m[3],
      hasTime ? +m[4] : (endOfDay ? 23 : 0),
      hasTime ? +m[5] : (endOfDay ? 59 : 0),
      hasTime ? 0 : (endOfDay ? 59 : 0)
    );
  }

  /* --- 알고 있는 화보ID 전체 (랭킹 + 이벤트 대상) --- */
  var KNOWN = {};
  (function () {
    for (var k in RANK) KNOWN[k] = 1;
    for (var i = 0; i < EVENTS.length; i++) {
      var t = EVENTS[i].targets || [];
      for (var j = 0; j < t.length; j++) KNOWN[String(t[j])] = 1;
    }
  })();

  function pickId(text) {
    if (!text) return null;
    var found = String(text).match(/\d{4,9}/g);
    if (!found) return null;
    for (var i = 0; i < found.length; i++) {
      if (KNOWN[found[i]]) return found[i];
    }
    return null;
  }

  function resolveId() {
    var nodes = [document.getElementById('bcut-event'), document.getElementById('bcut-rank')];
    for (var n = 0; n < nodes.length; n++) {
      if (nodes[n]) {
        var manual = nodes[n].getAttribute('data-id');
        if (manual) { log('id from data-id:', manual); return manual.trim(); }
      }
    }
    var fromUrl = pickId(location.href);
    if (fromUrl) { log('id from URL:', fromUrl); return fromUrl; }
    var imgs = document.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++) {
      var hit = pickId(imgs[i].getAttribute('src') || '');
      if (hit) { log('id from img:', hit); return hit; }
    }
    log('id 인식 실패');
    return null;
  }

  /* --- 배지 문구 자동 판정 --- */
  function makeLabel(h) {
    if (!h || !h[0]) return null;
    var now = h[0], prev = h[1], prev2 = h[2];
    if (!prev && now <= 5) return '이번 주 첫 진입';
    if (prev && prev - now >= 5) return '지난주보다 ' + (prev - now) + '계단 상승';
    if (now <= 10 && prev && prev <= 10 && prev2 && prev2 <= 10) return '3주 연속 TOP 10';
    if (now === 1 && prev === 1) return '2주 연속 1위';
    if (prev && Math.abs(prev - now) <= 1 && now <= 10) return '지난주 순위 유지';
    return null;
  }

  function buildUrl(path, medium, extra) {
    var u = path + (path.indexOf('?') > -1 ? '&' : '?');
    u += 'utm_source=bcut&utm_medium=' + medium + '&utm_campaign=rank_badge';
    if (extra) u += extra;
    return u;
  }

  /* ---------- 하단 랭킹 배지 ---------- */
  function renderRank(mount, rank, label, id) {
    var a = document.createElement('a');
    a.href = buildUrl(SITE + '/', 'detail', (rank ? '&utm_content=rank' + rank : '') + (id ? '&pid=' + id : ''));
    a.target = '_blank'; a.rel = 'noopener';
    css(a, {
      display: 'flex', alignItems: 'center', gap: '18px',
      maxWidth: '760px', margin: '36px auto', padding: '20px 22px',
      background: INK, border: '1px solid rgba(201,162,39,.38)',
      borderRadius: '2px', textDecoration: 'none', fontFamily: FONT,
      transition: 'border-color .2s ease, background .2s ease', boxSizing: 'border-box'
    });

    if (rank) {
      var num = document.createElement('div');
      num.textContent = rank;
      css(num, {
        flex: '0 0 auto', minWidth: '62px', textAlign: 'center', color: GOLD,
        fontSize: '46px', fontWeight: '800', lineHeight: '1', letterSpacing: '-.03em',
        borderRight: '1px solid rgba(255,255,255,.13)', paddingRight: '18px'
      });
      a.appendChild(num);
    }

    var box = document.createElement('div');
    css(box, { flex: '1 1 auto', minWidth: '0' });

    var eyebrow = document.createElement('div');
    eyebrow.textContent = 'MAXIM B컷 WEEKLY RANKING · ' + WEEK;
    css(eyebrow, {
      color: GOLD, fontSize: '11px', fontWeight: '700', letterSpacing: '.14em',
      marginBottom: '7px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
    });

    var title = document.createElement('div');
    title.textContent = rank ? '이 화보는 이번 주 ' + rank + '위입니다' : '이번 주 가장 많이 본 화보 TOP 10';
    css(title, { color: '#fff', fontSize: '17px', fontWeight: '700', lineHeight: '1.4' });

    box.appendChild(eyebrow);
    box.appendChild(title);

    if (label) {
      var tag = document.createElement('span');
      tag.textContent = label;
      css(tag, {
        display: 'inline-block', marginTop: '8px', padding: '4px 9px',
        background: 'rgba(201,162,39,.14)', border: '1px solid rgba(201,162,39,.45)',
        color: GOLD, fontSize: '12px', fontWeight: '700', borderRadius: '2px'
      });
      box.appendChild(tag);
    }

    var sub = document.createElement('div');
    sub.textContent = rank ? '전체 랭킹 보기' : '지금 순위 확인하기';
    css(sub, { color: 'rgba(255,255,255,.62)', fontSize: '13px', marginTop: '7px' });
    box.appendChild(sub);

    a.appendChild(box);

    var arrow = document.createElement('div');
    arrow.textContent = '\u2192';
    css(arrow, { flex: '0 0 auto', color: GOLD, fontSize: '20px', paddingLeft: '6px' });
    a.appendChild(arrow);

    a.onmouseover = function () { a.style.borderColor = GOLD; a.style.background = '#141414'; };
    a.onmouseout = function () { a.style.borderColor = 'rgba(201,162,39,.38)'; a.style.background = INK; };
    a.onclick = function () {
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'rank_badge_click', { rank: rank || 0, photo_id: id || '', label: label || '' });
        }
      } catch (e) {}
    };

    if (window.innerWidth < 480) {
      a.style.gap = '14px'; a.style.padding = '16px';
      if (rank) { a.firstChild.style.fontSize = '34px'; a.firstChild.style.minWidth = '46px'; a.firstChild.style.paddingRight = '13px'; }
      title.style.fontSize = '15px'; eyebrow.style.fontSize = '10px';
    }

    mount.innerHTML = '';
    mount.appendChild(a);
  }

  /* ---------- 이벤트 선택 ---------- */
  function pickEvent(id) {
    var now = new Date();
    for (var i = 0; i < EVENTS.length; i++) {
      var e = EVENTS[i];
      if (!e || e.on === false) continue;

      var s = parseDT(e.start, false);
      var en = parseDT(e.end, true);
      if (s && now < s) { log('이벤트 시작 전:', e.title); continue; }
      if (en && now > en) { log('이벤트 종료:', e.title); continue; }

      var t = e.targets || [];
      if (t.length) {
        if (!id) { log('대상 지정 이벤트인데 id 미인식:', e.title); continue; }
        var hit = false;
        for (var j = 0; j < t.length; j++) if (String(t[j]) === String(id)) { hit = true; break; }
        if (!hit) continue;
      }
      return { data: e, end: en };
    }
    return null;
  }

  /* ---------- 상단 이벤트 스트립 ---------- */
  function renderEvent(mount, ev) {
    var e = ev.data;
    var end = ev.end;
    var urgent = end && (end - new Date()) <= 48 * 3600 * 1000;
    var accent = urgent ? RED : GOLD;

    var a = document.createElement('a');
    a.href = buildUrl(e.url, 'detail_top', '');
    a.target = '_blank'; a.rel = 'noopener';
    css(a, {
      display: 'flex', alignItems: 'center', gap: '12px',
      maxWidth: '760px', margin: '0 auto 22px', padding: '13px 16px',
      background: urgent ? 'linear-gradient(90deg,#1d0d0b,#0c0c0d)' : 'linear-gradient(90deg,#1a1509,#0c0c0d)',
      borderLeft: '3px solid ' + accent, borderRadius: '2px',
      textDecoration: 'none', fontFamily: FONT, boxSizing: 'border-box'
    });

    var tag = document.createElement('span');
    tag.textContent = e.tag || 'EVENT';
    css(tag, {
      flex: '0 0 auto', color: '#fff', background: accent, fontSize: '10px', fontWeight: '800',
      letterSpacing: '.1em', padding: '4px 7px', borderRadius: '2px', whiteSpace: 'nowrap'
    });

    var txt = document.createElement('div');
    css(txt, { flex: '1 1 auto', minWidth: '0' });

    var t1 = document.createElement('div');
    t1.textContent = e.title;
    css(t1, { color: '#fff', fontSize: '14px', fontWeight: '700', lineHeight: '1.35' });
    txt.appendChild(t1);

    if (e.sub) {
      var t2 = document.createElement('div');
      t2.textContent = e.sub;
      css(t2, {
        color: 'rgba(255,255,255,.6)', fontSize: '12px', marginTop: '3px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      });
      txt.appendChild(t2);
    }

    a.appendChild(tag); a.appendChild(txt);

    if (end) {
      var clock = document.createElement('div');
      css(clock, {
        flex: '0 0 auto', color: accent, fontSize: '14px', fontWeight: '800',
        letterSpacing: '.02em', fontVariantNumeric: 'tabular-nums', textAlign: 'right', minWidth: '68px'
      });
      a.appendChild(clock);

      var tick = function () {
        var left = end - new Date();
        if (left <= 0) { a.parentNode && a.parentNode.removeChild(a); return; }
        var days = Math.floor(left / 86400000);
        if (days >= 2) {
          clock.textContent = 'D-' + days;
        } else {
          var s = Math.floor(left / 1000);
          clock.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60);
        }
      };
      tick();
      setInterval(tick, 1000);
    }

    a.onclick = function () {
      try {
        if (typeof window.gtag === 'function') window.gtag('event', 'event_strip_click', { title: e.title });
      } catch (err) {}
    };

    mount.innerHTML = '';
    mount.appendChild(a);
  }

  ready(function () {
    var id = resolveId();

    var evMount = document.getElementById('bcut-event');
    if (evMount) {
      var ev = pickEvent(id);
      log('이벤트:', ev ? ev.data.title : '없음');
      if (ev) renderEvent(evMount, ev);
    }

    var mount = document.getElementById('bcut-rank');
    if (!mount) { log('#bcut-rank 없음'); return; }

    var hist = id ? RANK[id] : null;
    var rank = hist ? hist[0] : null;
    var label = makeLabel(hist);
    log('id:', id, '/ 순위:', rank, '/ 배지:', label);
    renderRank(mount, rank, label, id);
  });
})();

/* ------------------------------------------------------------
   [admin.html 내보내기 - 최근 3주치 stats]

   function exportRankJS(w0, w1, w2) {
     var obj = {};
     Object.keys(w0).forEach(function (id) {
       obj[id] = [w0[id], w1[id] || null, w2[id] || null];
     });
     navigator.clipboard.writeText('var RANK = ' + JSON.stringify(obj, null, 2) + ';');
     alert('복사 완료. RANK 부분에 덮어쓰고 커밋하세요.');
   }
------------------------------------------------------------ */
