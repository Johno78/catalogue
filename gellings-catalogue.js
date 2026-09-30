/* Gellings live catalogue helper — drop into any johno78.github.io page.
   <script src="https://johno78.github.io/catalogue/gellings-catalogue.js" defer></script>
   Reads data/gellings-catalogue.json from the same place as this script (made by the "Catalogue feed" snippet) and fills in:
     <span data-price="DIDET-1-TB"></span>          → £2.24
     <span data-stock="DIDET-1-TB"></span>          → In stock / Out of stock – call 01624 671200
     <span data-name="DIDET-1-TB"></span>           → 1 LITRE Thick Bleach
     <span data-pack="DIDET-1-TB"></span>           → 1 litres
     <img  data-img="DIDET-1-TB">                   → product photo
     <a    data-link="DIDET-1-TB">Buy</a>           → link to the product page (greyed out if out of stock)
     <div  data-product="DIDET-1-TB"></div>         → a complete product card
     <div  data-category="PAPER > TOILET TISSUE"></div> → cards for every product in that category
     <div  data-search="bleach"></div>              → cards for every product whose name contains the words
   Any element with data-code="…" also gets the class gc-out when that product is out of stock. */
(function () {
  var me = document.currentScript;
  var FEED = (me && me.dataset.feed) || (me && me.src ? new URL('data/gellings-catalogue.json', me.src).href : 'data/gellings-catalogue.json');   // data/ next to this script
  var PHONE = '01624 671200';
  var css = '.gc-card{border:1px solid #ddd;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:6px;background:#fff;color:#222;font:14px/1.35 Arial,sans-serif}' +
    '.gc-card img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#fafafa}' +
    '.gc-card .gc-name{font-weight:bold}.gc-card .gc-price{font-size:17px;color:#0a7a5a;font-weight:bold}' +
    '.gc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}' +
    '.gc-in{color:#0a7a5a}.gc-oos{color:#b3261e}.gc-btn{display:inline-block;text-align:center;padding:8px;border-radius:6px;background:#0a7a5a;color:#fff!important;text-decoration:none;margin-top:auto}' +
    '.gc-btn.gc-call{background:#555}a.gc-disabled{opacity:.5}.gc-out img{opacity:.55}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var norm = function (s) { return String(s || '').trim().toUpperCase(); };
  var esc = function (s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (n) { return '£' + Number(n).toFixed(2); };
  var stockText = function (p) { return p.in_stock ? 'In stock' : 'Out of stock – call ' + PHONE; };
  function card(p) {
    return '<div class="gc-card' + (p.in_stock ? '' : ' gc-out') + '">' +
      (p.image ? '<img loading="lazy" src="' + esc(p.image) + '" alt="' + esc(p.name) + '">' : '') +
      '<div class="gc-name">' + esc(p.name) + '</div>' +
      (p.pack ? '<div>' + esc(p.pack) + '</div>' : '') +
      '<div class="gc-price">' + (p.price > 0 ? money(p.price) + ' <small>ex VAT</small>' : 'Call for price') + '</div>' +
      '<div class="' + (p.in_stock ? 'gc-in' : 'gc-oos') + '">' + stockText(p) + '</div>' +
      (p.in_stock ? '<a class="gc-btn" href="' + esc(p.url) + '">Buy online</a>' : '<a class="gc-btn gc-call" href="tel:' + PHONE.replace(/\s/g, '') + '">Call to order</a>') + '</div>';
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
    document.querySelectorAll('[data-updated]').forEach(function (el) { el.textContent = new Date(feed.generated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); });
    document.dispatchEvent(new CustomEvent('gellings:catalogue', { detail: feed }));
  }
  fetch(FEED, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(apply)
    .catch(function (e) { console.warn('Gellings catalogue feed not loaded:', e); });
})();
