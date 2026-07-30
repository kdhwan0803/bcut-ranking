/* ============================================================
   MAXIM B컷 - 화보 상세페이지 랭킹 배지 + 이벤트 스트립  v16
   bcutrank.com/rank-badge.js
   (흰 배경 상세페이지용 / 넷플릭스 톤 · 블랙 블록)

   [상세페이지 최상단]
   <div id="bcut-event" data-id="화보ID"></div>

   [상세페이지 최하단]
   <div id="bcut-rank"></div>
   <script src="https://bcutrank.com/rank-badge.js"></script>
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     1. 매주 갱신 - 이 블록만 통째로 갈아끼우면 됩니다
        (admin "배지 코드 만들기" 버튼이 뽑아주는 그대로)
     ========================================================== */
  /* >>> WEEKLY START <<< */

  var WEEK = '7월 4주';

  // { "화보ID": [이번주, 지난주, 2주전] }
  var RANK = {
    "1952": [4, null, null],
    "1953": [5, null, null],
    "1966": [1, null, null],
    "1999": [3, null, null],
    "2011": [2, null, null]
  };

  /* >>> WEEKLY END <<< */

  /* ---------- 2. 설정 (한 번만 정하면 끝) ---------- */

  var SITE = 'https://bcutrank.com';
  var TOP1 = '';           // 이번 주 1위 모델명. 비워두면 이름 대신 궁금증 문구가 나감
  var LABEL_MAX = 10;      // 이 순위 안에서만 변동 칩(상승/연속 등)을 띄움
  var ROLL = true;         // 부가 문구를 롤링으로 돌릴지
  var ROLL_MS = 3500;      // 롤링 전환 간격 (ms)
  var FALLBACK = true;     // 랭킹 데이터에 없는 화보에 'TOP 10 보기' 배너를 띄울지
  var RELEASE_DAY = 1;     // 랭킹 발표 요일 (0=일 1=월 ... 6=토)
  var MAXW = '680px';      // 배지 최대 폭 (가운데 정렬)

  var FRAME = true;        // 상위권 화보의 본문 영역에 테두리를 두를지
  var FRAME_MAX = 5;       // 몇 위까지 두를지 (1=1위만, 3=금은동, 5=TOP5까지)
  var FRAME_LABEL = true;  // 테두리 좌상단 라벨 표시
  var FRAME_TARGET = '#work-view';   // 테두리를 두를 영역의 CSS 선택자. 비우면 자동 탐색
  var FRAME_MIN_H = 320;   // 자동 탐색 시 이 높이(px) 이상인 첫 조상을 대상으로
  var FRAME_UP = 0;        // 자동 탐색 결과에서 위로 더 올라갈 단계 수 (0,1,2...)

  /* ---------- 3. 이벤트 (여러 개 등록 가능) ----------
     targets: []        -> 전 화보 노출
     targets: ["1966"]  -> 그 화보에만
     start / end        -> "2026-08-01" 또는 "2026-08-01 21:00"
  ------------------------------------------------------------ */

  var EVENTS = [
    // {
    //   on: true,
    //   targets: ["1966"],
    //   tag: 'TIME SALE',
    //   title: '오늘 밤 한정 50% 할인',
    //   sub: '자정까지 코인 10개 -> 5개',
    //   url: 'https://bcut.maximkorea.net/...',
    //   start: '2026-08-01 21:00',
    //   end: '2026-08-01 23:59'
    // }
  ];

  /* ---------- 4. 아래는 건드릴 일 없음 ---------- */

  var DEBUG = /[?&]bcutdebug=1/.test(location.search);
  var RED = '#e50914';
  var BLACK = '#111111';
  var LINE = '#e6e6ea';
  var DIM = '#7c7c82';
  var FONT = 'Pretendard, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  function isNarrow() { return window.innerWidth < 560; }
  var NARROW = isNarrow();

  function log() {
    if (DEBUG && window.console) console.log.apply(console, ['[bcut-rank]'].concat([].slice.call(arguments)));
  }
  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  function css(el, o) { for (var k in o) el.style[k] = o[k]; }
  function el(tag, style, text) {
    var n = document.createElement(tag);
    if (style) css(n, style);
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function parseDT(s, endOfDay) {
    if (!s) return null;
    var m = String(s).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/);
    if (!m) return null;
    var hasTime = m[4] !== undefined;
    return new Date(+m[1], +m[2] - 1, +m[3],
      hasTime ? +m[4] : (endOfDay ? 23 : 0),
      hasTime ? +m[5] : (endOfDay ? 59 : 0),
      hasTime ? 0 : (endOfDay ? 59 : 0));
  }

  /* --- 화보ID 인식 --- */
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
    var found = String(text).match(/\d{3,9}/g);
    if (!found) return null;
    for (var i = 0; i < found.length; i++) if (KNOWN[found[i]]) return found[i];
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

  /* --- 상위권 화보 본문 테두리 --- */
  var FRAME_TONE = [
    { color: '#c9a227', soft: 'rgba(201,162,39,.16)',  ink: '#1a1400', text: '이번 주 1위 화보' },
    { color: '#9fa6b0', soft: 'rgba(159,166,176,.16)', ink: '#14181d', text: '이번 주 2위 화보' },
    { color: '#b87333', soft: 'rgba(184,115,51,.16)',  ink: '#ffffff', text: '이번 주 3위 화보' },
    { color: '#4f5b6b', soft: 'rgba(79,91,107,.14)',   ink: '#ffffff', text: '이번 주 4위 화보' },
    { color: '#6c7886', soft: 'rgba(108,120,134,.14)', ink: '#ffffff', text: '이번 주 5위 화보' }
  ];

  function nodeDesc(n) {
    var r = n.getBoundingClientRect();
    return n.tagName
      + (n.id ? '#' + n.id : '')
      + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : '')
      + '  [' + Math.round(r.width) + 'x' + Math.round(r.height) + ']';
  }

  // 디버그: 조상 목록을 전부 찍어줌 (어디에 테두리를 칠지 고를 때 사용)
  function logAncestors(mount) {
    if (!DEBUG || !mount) return;
    var n = mount.parentNode, i = 0;
    log('--- 조상 목록 (위로 갈수록 큰 영역) ---');
    while (n && n.nodeType === 1 && i < 12) {
      log('  [' + i + ']', nodeDesc(n));
      if (n === document.body) break;
      n = n.parentNode; i++;
    }
    log('--- FRAME_TARGET 에 넣거나, FRAME_UP 으로 단계를 올리세요 ---');
  }

  function frameTarget() {
    var mount = document.getElementById('bcut-rank') || document.getElementById('bcut-event');
    logAncestors(mount);

    if (FRAME_TARGET) {
      try {
        var q = document.querySelector(FRAME_TARGET);
        if (q) { log('테두리 대상(선택자):', nodeDesc(q)); return q; }
        log('선택자에 맞는 요소 없음:', FRAME_TARGET);
      } catch (e) { log('선택자 오류:', FRAME_TARGET); }
    }

    if (!mount) return null;

    var node = mount.parentNode, step = 0, found = null;
    while (node && node !== document.body && node.nodeType === 1 && step < 8) {
      var r = node.getBoundingClientRect();
      if (r.height >= FRAME_MIN_H && r.width >= 280) { found = node; break; }
      node = node.parentNode; step++;
    }
    if (!found) { log('테두리 대상 못 찾음 - 생략'); return null; }

    for (var up = 0; up < FRAME_UP; up++) {
      var pa = found.parentNode;
      if (!pa || pa === document.body || pa.nodeType !== 1) break;
      found = pa;
    }

    log('테두리 대상(자동, FRAME_UP=' + FRAME_UP + '):', nodeDesc(found));
    return found;
  }

  function renderFrame(rank) {
    if (!FRAME || !rank || rank > FRAME_MAX || rank > FRAME_TONE.length) return;
    if (document.getElementById('bcut-frame-label')) return;

    var box = frameTarget();
    if (!box) return;

    var tone = FRAME_TONE[rank - 1];
    var narrow = isNarrow();
    var w = narrow ? '3px' : '4px';

    // 바깥으로 나가지 않는 안쪽 링 (레이아웃 영향 없음)
    box.style.boxShadow = 'inset 0 0 0 ' + w + ' ' + tone.color +
                          ', inset 0 0 30px ' + tone.soft;

    if (!FRAME_LABEL) return;

    try {
      if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
    } catch (e) {}

    var tab = el('div', {
      position: 'absolute', top: '0', left: '50%',
      transform: 'translateX(-50%)',
      background: tone.color, color: tone.ink,
      fontFamily: FONT, fontSize: narrow ? '11px' : '12.5px', fontWeight: '900',
      letterSpacing: '.02em', padding: narrow ? '5px 14px 6px' : '6px 20px 7px',
      borderRadius: '0 0 4px 4px', pointerEvents: 'none', zIndex: '20',
      whiteSpace: 'nowrap'
    }, tone.text);
    tab.id = 'bcut-frame-label';
    box.appendChild(tab);
  }

  /* --- 한 줄 롤링 --- */
  function makeRoller(items, narrow) {
    var h = narrow ? 18 : 20;
    var box = el('div', {
      position: 'relative', height: h + 'px', overflow: 'hidden',
      marginTop: narrow ? '6px' : '8px'
    });

    var reduce = false;
    try {
      reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var nodes = [];
    for (var i = 0; i < items.length; i++) {
      var line = el('div', {
        position: 'absolute', left: '0', top: '0', width: '100%', height: h + 'px',
        display: 'flex', alignItems: 'center',
        transform: i === 0 ? 'translateY(0)' : 'translateY(100%)',
        opacity: i === 0 ? '1' : '0',
        transition: 'transform .5s cubic-bezier(.4,0,.2,1), opacity .5s ease'
      });
      line.appendChild(items[i]);
      box.appendChild(line);
      nodes.push(line);
    }

    if (items.length < 2 || !ROLL || reduce) return box;

    var idx = 0, timer = null;

    function step() {
      var cur = nodes[idx];
      var nxt = nodes[(idx + 1) % nodes.length];

      // 다음 줄을 애니메이션 없이 아래로 내려놓고
      nxt.style.transition = 'none';
      nxt.style.transform = 'translateY(100%)';
      nxt.style.opacity = '0';
      void nxt.offsetHeight;
      nxt.style.transition = 'transform .5s cubic-bezier(.4,0,.2,1), opacity .5s ease';

      cur.style.transform = 'translateY(-100%)';
      cur.style.opacity = '0';
      nxt.style.transform = 'translateY(0)';
      nxt.style.opacity = '1';

      idx = (idx + 1) % nodes.length;
    }

    function start() { if (!timer) timer = setInterval(step, ROLL_MS); }
    function stop() { clearInterval(timer); timer = null; }

    box.addEventListener('mouseenter', stop);
    box.addEventListener('mouseleave', start);
    start();

    return box;
  }

  /* --- 다음 발표까지 남은 일수 --- */
  function daysToRelease() {
    var d = new Date().getDay();
    var left = (RELEASE_DAY - d + 7) % 7;
    return left;
  }

  /* ================= 하단 랭킹 배지 (블랙 블록) ================= */
  function renderRank(mount, rank, label, id) {
    NARROW = isNarrow();

    var a = el('a', {
      display: 'flex', alignItems: 'stretch',
      width: '100%', maxWidth: MAXW, margin: '40px auto 8px',
      border: '1px solid ' + LINE,
      textDecoration: 'none', fontFamily: FONT, boxSizing: 'border-box',
      overflow: 'hidden', background: '#fff',
      transition: 'border-color .18s ease'
    });
    a.href = buildUrl(SITE + '/', 'detail', (rank ? '&utm_content=rank' + rank : '') + (id ? '&pid=' + id : ''));
    a.target = '_blank';
    a.rel = 'noopener';

    /* 왼쪽 검정 블록 */
    var block = el('div', {
      flex: '0 0 ' + (NARROW ? '72px' : '104px'),
      background: BLACK, color: '#fff',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '2px'
    });

    if (rank) {
      block.appendChild(el('strong', {
        fontSize: NARROW ? '34px' : '46px', fontWeight: '900',
        lineHeight: '.9', letterSpacing: '-.06em'
      }, String(rank)));
      block.appendChild(el('span', {
        fontSize: NARROW ? '9px' : '10px', fontWeight: '800',
        letterSpacing: '.18em', color: RED
      }, 'WEEK'));
    } else {
      block.appendChild(el('strong', {
        fontSize: NARROW ? '34px' : '46px', fontWeight: '900',
        lineHeight: '.9', letterSpacing: '-.04em'
      }, '?'));
      block.appendChild(el('span', {
        fontSize: NARROW ? '9px' : '10px', fontWeight: '800',
        letterSpacing: '.18em', color: RED
      }, 'RANK'));
    }
    a.appendChild(block);

    /* 가운데 본문 */
    var body = el('div', {
      flex: '1 1 auto', minWidth: '0',
      padding: NARROW ? '13px 14px' : '18px 22px'
    });

    body.appendChild(el('div', {
      fontSize: NARROW ? '9px' : '10px', fontWeight: '800', letterSpacing: '.14em',
      color: RED, marginBottom: NARROW ? '6px' : '8px',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
    }, NARROW ? 'WEEKLY RANKING · ' + WEEK : 'MAXIM B컷 WEEKLY RANKING · ' + WEEK));

    body.appendChild(el('div', {
      fontSize: NARROW ? '14.5px' : '17px', fontWeight: '800',
      letterSpacing: '-.015em', lineHeight: '1.3', color: BLACK
    }, rank ? '이번 주 랭킹 ' + rank + '위 화보'
           : (TOP1 ? '이번 주 1위는 ' + TOP1 : '이번 주 1위 화보는?')));

    /* 부가 문구 (롤링) */
    var teaser, teaserMode;
    if (!rank) {
      teaser = 'TOP 10 전체 순위 보기';
      teaserMode = 'fallback';
    } else if (rank === 1) {
      teaser = '이번 주 가장 많이 본 화보';
      teaserMode = 'top';
    } else if (TOP1) {
      teaser = '이번 주 1위는 ' + TOP1;
      teaserMode = 'name';
    } else {
      teaser = '그럼 이번 주 1위 화보는?';
      teaserMode = 'hide';
    }
    window.__bcutTeaserMode = teaserMode;

    var items = [];

    items.push(el('span', {
      color: (teaserMode === 'name' || teaserMode === 'top') ? DIM : BLACK,
      fontSize: NARROW ? '11.5px' : '12.5px',
      fontWeight: (teaserMode === 'name' || teaserMode === 'top') ? '400' : '700',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
    }, teaser));

    if (label) {
      items.push(el('span', {
        display: 'inline-block', padding: '2px 7px',
        background: '#fdeced', color: RED,
        fontSize: NARROW ? '10.5px' : '11.5px', fontWeight: '800',
        letterSpacing: '-.01em', whiteSpace: 'nowrap'
      }, label));
    }

    items.push(el('span', {
      color: DIM, fontSize: NARROW ? '11.5px' : '12.5px',
      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
    }, '판매 · 조회 데이터로 매주 집계'));

    body.appendChild(makeRoller(items, NARROW));

    /* 좁은 화면: CTA + 다음 발표를 본문 안에 */
    if (NARROW) {
      var foot = el('div', {
        display: 'flex', alignItems: 'baseline', gap: '9px',
        marginTop: '10px', flexWrap: 'wrap'
      });
      foot.appendChild(el('span', {
        fontSize: '12px', fontWeight: '800', color: BLACK,
        borderBottom: '2px solid ' + RED, paddingBottom: '1px'
      }, '전체 랭킹 보기'));
      foot.appendChild(el('span', { color: '#a3a3a9', fontSize: '11px', fontWeight: '700' }, releaseText()));
      body.appendChild(foot);
    }
    a.appendChild(body);

    /* 오른쪽 CTA */
    if (!NARROW) {
      var cta = el('div', {
        flex: '0 0 auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: '5px',
        padding: '0 22px', borderLeft: '1px solid ' + LINE, whiteSpace: 'nowrap'
      });
      var ctaTop = el('div', {
        display: 'flex', alignItems: 'center', gap: '8px',
        color: BLACK, fontSize: '13px', fontWeight: '800'
      });
      ctaTop.appendChild(el('span', null, '전체 랭킹 보기'));
      ctaTop.appendChild(el('span', { color: RED, fontSize: '16px', fontWeight: '800' }, '\u2192'));
      cta.appendChild(ctaTop);
      cta.appendChild(el('div', { color: '#a3a3a9', fontSize: '11px', fontWeight: '700' }, releaseText()));
      a.appendChild(cta);
    }

    a.onmouseover = function () { a.style.borderColor = BLACK; };
    a.onmouseout = function () { a.style.borderColor = LINE; };
    a.onclick = function () {
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'rank_badge_click', {
            rank: rank || 0, photo_id: id || '', label: label || '',
            teaser_mode: window.__bcutTeaserMode || ''
          });
        }
      } catch (e) {}
    };

    mount.innerHTML = '';
    mount.appendChild(a);
  }

  function releaseText() {
    var d = daysToRelease();
    if (d === 0) return '오늘 순위 발표';
    return '다음 발표까지 D-' + d;
  }

  /* ================= 이벤트 선택 ================= */
  function pickEvent(id) {
    var now = new Date();
    for (var i = 0; i < EVENTS.length; i++) {
      var e = EVENTS[i];
      if (!e || e.on === false) continue;
      var s = parseDT(e.start, false);
      var en = parseDT(e.end, true);
      if (s && now < s) { log('시작 전:', e.title); continue; }
      if (en && now > en) { log('종료:', e.title); continue; }
      var t = e.targets || [];
      if (t.length) {
        if (!id) { log('대상 지정인데 id 미인식:', e.title); continue; }
        var hit = false;
        for (var j = 0; j < t.length; j++) if (String(t[j]) === String(id)) { hit = true; break; }
        if (!hit) continue;
      }
      return { data: e, end: en };
    }
    return null;
  }

  /* ================= 상단 이벤트 스트립 ================= */
  function renderEvent(mount, ev) {
    NARROW = isNarrow();
    var e = ev.data, end = ev.end;
    var urgent = end && (end - new Date()) <= 48 * 3600 * 1000;

    var a = el('a', {
      display: 'flex', alignItems: 'stretch',
      width: '100%', maxWidth: MAXW, margin: '0 auto 22px',
      border: '1px solid ' + (urgent ? RED : LINE),
      background: '#fff', textDecoration: 'none', fontFamily: FONT,
      boxSizing: 'border-box', overflow: 'hidden'
    });
    a.href = buildUrl(e.url, 'detail_top', '');
    a.target = '_blank';
    a.rel = 'noopener';

    var tagBox = el('div', {
      flex: '0 0 auto', display: 'flex', alignItems: 'center',
      background: urgent ? RED : BLACK, color: '#fff',
      padding: NARROW ? '0 11px' : '0 15px',
      fontSize: '10px', fontWeight: '800', letterSpacing: '.14em', whiteSpace: 'nowrap'
    }, e.tag || 'EVENT');
    a.appendChild(tagBox);

    var body = el('div', {
      flex: '1 1 auto', minWidth: '0',
      padding: NARROW ? '11px 13px' : '13px 18px'
    });
    body.appendChild(el('div', {
      color: BLACK, fontSize: NARROW ? '13.5px' : '14.5px', fontWeight: '800',
      lineHeight: '1.35', letterSpacing: '-.01em'
    }, e.title));
    if (e.sub) {
      body.appendChild(el('div', {
        color: DIM, fontSize: '12px', marginTop: '4px',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
      }, e.sub));
    }
    a.appendChild(body);

    if (end) {
      var clock = el('div', {
        flex: '0 0 auto', display: 'flex', alignItems: 'center',
        padding: NARROW ? '0 13px' : '0 20px',
        borderLeft: '1px solid ' + LINE,
        color: urgent ? RED : BLACK,
        fontSize: NARROW ? '13px' : '14.5px', fontWeight: '900',
        letterSpacing: '.02em', fontVariantNumeric: 'tabular-nums',
        minWidth: NARROW ? '74px' : '92px', justifyContent: 'center'
      });
      a.appendChild(clock);

      var tick = function () {
        var left = end - new Date();
        if (left <= 0) { if (a.parentNode) a.parentNode.removeChild(a); return; }
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

    // 순위는 그대로 표시하고, 변동 칩만 상위권에서만
    if (rank && LABEL_MAX && rank > LABEL_MAX) {
      log('순위 ' + rank + '위 - LABEL_MAX(' + LABEL_MAX + ') 밖이라 변동 칩 생략');
      label = null;
    }

    log('id:', id, '/ 순위:', rank, '/ 배지:', label);

    renderFrame(hist ? hist[0] : null);

    // 순위가 없고 폴백도 끄면 아무것도 그리지 않음
    if (!rank && !FALLBACK) {
      log('표시할 순위 없음 - 배지 미노출');
      mount.innerHTML = '';
      return;
    }

    renderRank(mount, rank, label, id);

    // 화면 폭이 바뀌면 (회전 등) 다시 그림
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (isNarrow() !== NARROW) renderRank(mount, rank, label, id);
      }, 200);
    });
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
