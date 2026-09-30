/* Gellings live catalogue helper — v2
   <script src="https://johno78.github.io/catalogue/gellings-catalogue.js" defer></script>
   Reads data/gellings-catalogue.json from the same place as this script (made by the
   "Catalogue feed" snippet in the 3Legs panel) and fills in:

     <span data-price="DIDET-1-TB"></span>          → £2.24
     <span data-stock="DIDET-1-TB"></span>          → In stock / Out of stock – call 01624 671200
     <span data-name="DIDET-1-TB"></span>           → 1 LITRE Thick Bleach
     <span data-pack="DIDET-1-TB"></span>           → 1 litres
     <img  data-img="DIDET-1-TB">                   → product photo
     <a    data-link="DIDET-1-TB">Buy</a>           → link to the product page
     <div  data-product="DIDET-1-TB"></div>         → a complete product card
     <div  data-category="TOILET TISSUE"></div>     → cards for every product in that category (by name)
     <div  data-search="bleach"></div>              → cards for every product whose name contains the words

     Live products section (tabs + cards), by website category number:
     <section class="gc-live" hidden data-live-products="3=Hand Towels|4=Toilet Tissue"></section>
       optional: data-title="…"  and colours via style="--gc-accent:#0f7f7a;--gc-dark:#0d2438"
       Stays hidden until the feed has at least one matching product.
*/
(function () {
  var me = document.currentScript;
  var FEED = (me && me.dataset.feed) || (me && me.src ? new URL('data/gellings-catalogue.json', me.src).href : 'data/gellings-catalogue.json');
  var PHONE = '01624 671200';
  var PAGE = 12;   // cards shown per "Show more"

  var css =
    '.gc-card{border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;background:#fff;color:#222;font-size:14px;line-height:1.35;text-align:left}' +
    '.gc-card img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#fff;border-radius:6px}' +
    '.gc-card .gc-noimg{width:100%;aspect-ratio:4/3;background:#f2f2f2;border-radius:6px}' +
    '.gc-card .gc-name{font-weight:bold;color:var(--gc-dark,#1a2340)}' +
    '.gc-card .gc-pack{color:#666;font-size:13px}' +
    '.gc-card .gc-price{font-size:18px;color:var(--gc-dark,#1a2340);font-weight:bold}.gc-card .gc-price small{font-size:12px;font-weight:normal;color:#666}' +
    '.gc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}' +
    '.gc-in{color:#1b7a3a}.gc-oos{color:#b3261e}' +
    '.gc-btn{display:block;text-align:center;padding:9px;border-radius:6px;background:var(--gc-accent,#0f7f7a);color:#fff!important;text-decoration:none!important;margin-top:auto;font-weight:bold}' +
    '.gc-btn:hover{filter:brightness(1.1)}.gc-btn.gc-call{background:#555}.gc-out img{opacity:.6}a.gc-disabled{opacity:.5}' +
    '.gc-live{padding:56px 0}.gc-live-wrap{max-width:1180px;margin:0 auto;padding:0 24px}' +
    '.gc-live-kicker{display:inline-block;font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:bold;color:var(--gc-accent,#0f7f7a);margin-bottom:6px}' +
    '.gc-live h2{margin:0 0 6px;color:var(--gc-dark,#1a2340)}.gc-live-sub{margin:0 0 18px;color:#666;font-size:14px}' +
    '.gc-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}' +
    '.gc-tab{font:inherit;font-size:13px;padding:7px 14px;border-radius:999px;border:1px solid rgba(0,0,0,.18);background:#fff;color:var(--gc-dark,#1a2340);cursor:pointer}' +
    '.gc-tab[aria-pressed="true"]{background:var(--gc-dark,#1a2340);border-color:var(--gc-dark,#1a2340);color:#fff}' +
    '.gc-tab span{opacity:.65;margin-left:4px}' +
    '.gc-live[hidden],.gc-more[hidden]{display:none!important}' +
    '.gc-more{display:block;margin:20px auto 0;font:inherit;padding:10px 22px;border-radius:999px;border:1px solid var(--gc-dark,#1a2340);background:transparent;color:var(--gc-dark,#1a2340);cursor:pointer}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var norm = function (s) { return String(s || '').trim().toUpperCase(); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (n) { return '£' + Number(n).toFixed(2); };
  var stockText = function (p) { return p.in_stock ? 'In stock' : 'Out of stock – call ' + PHONE; };

  function card(p) {
    return '<div class="gc-card' + (p.in_stock ? '' : ' gc-out') + '">' +
      (p.image ? '<img loading="lazy" src="' + esc(p.image) + '" alt="' + esc(p.name) + '" onerror="this.outerHTML=\'<div class=gc-noimg></div>\'">' : '<div class="gc-noimg"></div>') +
      '<div class="gc-name">' + esc(p.name) + '</div>' +
      (p.pack ? '<div class="gc-pack">' + esc(p.pack) + '</div>' : '') +
      '<div class="gc-price">' + (p.price > 0 ? money(p.price) + ' <small>ex VAT</small>' : 'Call for price') + '</div>' +
      '<div class="' + (p.in_stock ? 'gc-in' : 'gc-oos') + '">' + stockText(p) + '</div>' +
      (p.in_stock ? '<a class="gc-btn" href="' + esc(p.url) + '">Buy online</a>'
                  : '<a class="gc-btn gc-call" href="tel:' + PHONE.replace(/\s/g, '') + '">Call to order</a>') +
      '</div>';
  }

  function liveSection(el, feed) {
    var tabs = String(el.getAttribute('data-live-products') || '').split('|').map(function (t) {
      var i = t.indexOf('='); return { id: Number(t.slice(0, i)), label: t.slice(i + 1).trim() };
    }).filter(function (t) { return t.id; });
    var inCat = function (p, id) { return (p.cat_ids || []).indexOf(id) >= 0; };
    tabs.forEach(function (t) { t.items = feed.products.filter(function (p) { return inCat(p, t.id); }); });
    tabs = tabs.filter(function (t) { return t.items.length; });
    var seen = {}, all = [];
    tabs.forEach(function (t) { t.items.forEach(function (p) { if (!seen[p.id]) { seen[p.id] = 1; all.push(p); } }); });
    if (!all.length) return;                                   // nothing to show → stay hidden
    all.sort(function (a, b) { return (b.in_stock - a.in_stock) || a.name.localeCompare(b.name); });
    tabs.forEach(function (t) { t.items.sort(function (a, b) { return (b.in_stock - a.in_stock) || a.name.localeCompare(b.name); }); });
    var views = [{ label: 'All', items: all }].concat(tabs.length > 1 ? tabs : []);
    var updated = new Date(feed.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    el.innerHTML = '<div class="gc-live-wrap"><span class="gc-live-kicker">Live from the Gellings website</span>' +
      '<h2>' + esc(el.getAttribute('data-title') || 'Live prices & stock') + '</h2>' +
      '<p class="gc-live-sub">Prices ex VAT · updated ' + esc(updated) + ' · out of stock? Call ' + PHONE + '</p>' +
      (views.length > 1 ? '<div class="gc-tabs" role="toolbar">' + views.map(function (v, i) {
        return '<button type="button" class="gc-tab" data-i="' + i + '" aria-pressed="' + (i ? 'false' : 'true') + '">' + esc(v.label) + '<span>' + v.items.length + '</span></button>';
      }).join('') + '</div>' : '') +
      '<div class="gc-grid"></div><button type="button" class="gc-more" hidden></button></div>';
    var grid = el.querySelector('.gc-grid'), more = el.querySelector('.gc-more'), cur = 0, shown = 0;
    function draw(reset) {
      var items = views[cur].items;
      if (reset) { shown = 0; grid.innerHTML = ''; }
      var next = items.slice(shown, shown + PAGE); shown += next.length;
      grid.insertAdjacentHTML('beforeend', next.map(card).join(''));
      more.hidden = shown >= items.length;
      more.textContent = 'Show more (' + (items.length - shown) + ' more)';
    }
    el.addEventListener('click', function (e) {
      var b = e.target.closest('.gc-tab');
      if (b) { cur = +b.getAttribute('data-i'); el.querySelectorAll('.gc-tab').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); draw(true); }
      if (e.target === more) draw(false);
    });
    draw(true);
    el.hidden = false;
  }

  function apply(feed) {
    var by = {}; feed.products.forEach(function (p) { by[norm(p.code)] = p; });
    var each = function (attr, fn) { document.querySelectorAll('[' + attr + ']').forEach(function (el) { var p = by[norm(el.getAttribute(attr))]; if (p) fn(el, p); else el.classList.add('gc-missing'); }); };
    each('data-price', function (el, p) { el.textContent = p.price > 0 ? money(p.price) : 'Call for price'; });
    each('data-name', function (el, p) { el.textContent = p.name; });
    each('data-pack', function (el, p) { el.textContent = p.pack; });
    each('data-stock', function (el, p) { el.textContent = stockText(p); el.classList.add(p.in_stock ? 'gc-in' : 'gc-oos'); });
    each('data-img', function (el, p) { if (p.image) { el.src = p.image; el.alt = el.alt || p.name; } });
    each('data-link', function (el, p) { el.href = p.url; if (!p.in_stock) el.classList.add('gc-disabled'); });
    each('data-code', function (el, p) { if (!p.in_stock) el.classList.add('gc-out'); });
    each('data-product', function (el, p) { el.innerHTML = card(p); });
    document.querySelectorAll('[data-category]').forEach(function (el) {
      var want = norm(el.getAttribute('data-category'));
      var list = feed.products.filter(function (p) { return p.categories.some(function (c) { c = norm(c); return c === want || c.slice(-want.length - 3) === ' > ' + want || c.indexOf(want + ' > ') === 0; }); });
      el.classList.add('gc-grid'); el.innerHTML = list.map(card).join('') || '<p>No products found.</p>';
    });
    document.querySelectorAll('[data-search]').forEach(function (el) {
      var words = norm(el.getAttribute('data-search')).split(/\s+/).filter(Boolean);
      var list = feed.products.filter(function (p) { var n = norm(p.name + ' ' + p.code); return words.every(function (w) { return n.indexOf(w) >= 0; }); });
      el.classList.add('gc-grid'); el.innerHTML = list.map(card).join('') || '<p>No products found.</p>';
    });
    document.querySelectorAll('[data-live-products]').forEach(function (el) { liveSection(el, feed); });
    document.querySelectorAll('[data-updated]').forEach(function (el) { el.textContent = new Date(feed.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); });
    document.dispatchEvent(new CustomEvent('gellings:catalogue', { detail: feed }));
  }

  fetch(FEED, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(apply)
    .catch(function (e) { console.warn('Gellings catalogue feed not loaded:', e); });
})();
