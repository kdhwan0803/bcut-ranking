(() => {
  'use strict';
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const image = value => { try { const url = new URL(value, location.href); return ['https:','http:'].includes(url.protocol) ? escape(url.href) : ''; } catch { return ''; } };
  const dateLabel = iso => `${Number(iso.slice(5,7))}.${Number(iso.slice(8,10))}`;
  const title = work => (work.title || '').replace(/^\[[^\]]+\]\s*/, '');
  const name = work => (work.models || []).join(' · ');
  const href = id => `https://bcut.maximkorea.net/work/${encodeURIComponent(id)}`;
  const todayKST = () => { const parts = new Intl.DateTimeFormat('en-US', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()); const get = type => parts.find(p => p.type === type).value; return `${get('year')}-${get('month')}-${get('day')}`; };
  const currentSource = new URLSearchParams(location.search);
  document.querySelectorAll('.checkout').forEach(link => {
    const target = new URL(link.href);
    ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(key => { const value = currentSource.get(key); if (value && value.length <= 100) target.searchParams.set(key,value); });
    link.href = target.href;
  });
  fetch('data.json', {cache:'no-store'}).then(response => { if (!response.ok) throw new Error('catalogue'); return response.json(); }).then(data => {
    const works = data.works || {}, today = todayKST();
    const eligible = Object.keys(works).filter(id => works[id].buy === '구독' && /^\d{4}-\d{2}-\d{2}$/.test(works[id].pub || '') && works[id].img);
    const active = eligible.filter(id => works[id].pub <= today).sort((a,b) => works[b].pub.localeCompare(works[a].pub)).slice(0,4);
    const upcoming = eligible.filter(id => works[id].pub > today).sort((a,b) => works[a].pub.localeCompare(works[b].pub)).slice(0,3);
    document.querySelectorAll('[data-active-count]').forEach(el => { el.textContent = `현재 열람 ${active.length}편`; });
    document.querySelectorAll('[data-catalogue-date]').forEach(el => { el.textContent = `${today.replaceAll('-','.')} 기준 · 작품을 누르면 B컷에서 상세 정보를 볼 수 있어요.`; });
    const selected = active.length > 2 ? [active[0], active[2]] : active.slice(0,2);
    const posters = selected.map(id => `<div class="hero-poster"><img src="${image(works[id].img)}" alt="${escape(name(works[id]))} 구독 화보 표지"><span>${escape(name(works[id]))}</span></div>`).join('');
    document.querySelectorAll('[data-hero-posters]').forEach(el => { el.innerHTML = posters; });
    document.querySelectorAll('[data-banner-posters]').forEach(el => { el.innerHTML = selected.map(id => `<img src="${image(works[id].img)}" alt="">`).join(''); });
    document.querySelectorAll('[data-active-works]').forEach(el => { el.innerHTML = active.length ? active.map(id => { const w = works[id]; return `<a class="work-card" href="${href(id)}" target="_blank" rel="noopener" aria-label="${escape(name(w)+' '+title(w))} 상세 정보 (새 창)"><span class="work-image"><img loading="lazy" src="${image(w.img)}" alt=""><span class="work-status">구독 열람 가능</span></span><h3 class="work-model">${escape(name(w))}</h3><p class="work-title">${escape(title(w))}</p><p class="work-format">${dateLabel(w.pub)} 공개 · ${w.vid?'영상 포함':'사진 화보'}</p></a>`; }).join('') : '<p class="loading">현재 등록된 구독 화보가 없습니다. B컷에서 최신 구독 대상을 확인하세요.</p>'; });
    document.querySelectorAll('[data-upcoming-works]').forEach(el => { el.innerHTML = upcoming.length ? upcoming.map(id => { const w=works[id]; return `<a class="upcoming-card" href="${href(id)}" target="_blank" rel="noopener" aria-label="${escape(name(w)+' '+title(w))} · ${dateLabel(w.pub)} 공개 예정 (새 창)"><img loading="lazy" src="${image(w.img)}" alt=""><div><strong>${escape(name(w))}</strong><p class="work-title">${escape(title(w))}</p><p class="upcoming-date">${dateLabel(w.pub)} 공개 예정</p></div></a>`; }).join('') : '<p class="loading">다음 구독 화보의 공개 일정을 준비 중입니다.</p>'; });
  }).catch(() => {
    document.querySelectorAll('[data-active-count]').forEach(el => { el.textContent='구독 대상 화보 열람'; });
    document.querySelectorAll('.loading,[data-catalogue-date]').forEach(el => { el.textContent='화보 정보를 불러오지 못했습니다. B컷에서 최신 목록을 확인해주세요.'; });
  });
})();
