(function () {
  'use strict';
  if (window.BCUTImages) return;
  var states = new WeakMap();
  // Embedded artwork needs no additional request, including when the network is offline.
  var placeholder = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">' +
    '<rect width="300" height="400" fill="#242126"/>' +
    '<g fill="none" stroke="#aaa4af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="121" y="153" width="58" height="45" rx="6"/><circle cx="137" cy="167" r="4"/>' +
    '<path d="m126 190 15-15 10 10 9-8 14 13"/></g>' +
    '<text x="150" y="230" text-anchor="middle" fill="#ddd8e0" font-family="system-ui,sans-serif" font-size="17">이미지를 불러올 수 없어요</text>' +
    '<text x="150" y="255" text-anchor="middle" fill="#aaa4af" font-family="system-ui,sans-serif" font-size="13">작품 정보는 확인할 수 있어요</text></svg>'
  );
  function source(img) { return img.getAttribute('src') || ''; }
  function candidate(img) {
    return img && img.tagName === 'IMG' && source(img) && !/\{\{|^data:/i.test(source(img));
  }
  function fail(img) {
    if (!candidate(img)) return;
    states.set(img, { source: source(img) });
    // Keep dimensions, alt text, badges and the surrounding link unchanged.
    img.setAttribute('src', placeholder);
  }
  function inspect(img) {
    var state = states.get(img);
    if (state && source(img) !== placeholder) states.delete(img);
    // An unfinished lazy image must never be mistaken for a failed image.
    if (candidate(img) && img.complete && img.naturalWidth === 0) fail(img);
  }
  function scan(root) {
    if (root.nodeType === 1 && root.tagName === 'IMG') inspect(root);
    if (root.querySelectorAll) root.querySelectorAll('img').forEach(inspect);
  }
  function original(img) {
    var state = states.get(img);
    return state && source(img) === placeholder ? state.source : source(img);
  }
  function matches(element, markup) {
    var template = document.createElement('template'); template.innerHTML = markup;
    var images = Array.from(element.querySelectorAll('img'));
    if (!images.some(function (img) { return states.has(img) && source(img) === placeholder; })) {
      return element.innerHTML.trim() === template.innerHTML.trim();
    }
    // Compare original paths so catalogue refreshes don't recreate failed images
    // or keep retrying the same URL every minute.
    var copy = element.cloneNode(true), copies = copy.querySelectorAll('img');
    images.forEach(function (img, i) {
      var state = states.get(img);
      if (state && source(img) === placeholder) copies[i].setAttribute('src', state.source);
    });
    return copy.innerHTML.trim() === template.innerHTML.trim();
  }
  function failed() {
    return Array.from(document.querySelectorAll('img')).filter(function (img) {
      return states.has(img) && source(img) === placeholder;
    }).map(function (img) {
      var host = img.closest('[data-work-id]'), link = img.closest('a[href]');
      var match = link && link.href.match(/(?:[?&]w=|\/work\/)(\d+)/);
      return { source: states.get(img).source, workId: host ? host.dataset.workId : match ? match[1] : '', title: img.alt || '' };
    });
  }
  window.BCUTImages = Object.freeze({ placeholder: placeholder, matches: matches, original: original, failed: failed });
  document.addEventListener('error', function (event) { fail(event.target); }, true);
  document.addEventListener('load', function (event) {
    var img = event.target;
    if (img.tagName === 'IMG' && source(img) !== placeholder) states.delete(img);
  }, true);
  new MutationObserver(function (changes) {
    changes.forEach(function (change) {
      if (change.type === 'attributes') inspect(change.target);
      else change.addedNodes.forEach(function (node) { if (node.isConnected) scan(node); });
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  scan(document);
})();
