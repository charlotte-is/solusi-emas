/* public/js/app.js
   Robust price loader + UI helpers for Solusi Emas
   Replace existing inline price script with a single <script src="js/app.js"></script>
*/
(function () {
  // CONFIG
  const PRICE_JSON_REL = 'data/price.json'; // relative (works for GitHub Pages subpath)
  const PRICE_JSON_ROOT = '/data/price.json'; // root path (works for root host)
  const FUNC_PRICE_NETLIFY = '/.netlify/functions/get-price';
  const FUNC_PRICE_VERCEL = '/api/get-price';
  const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const WA_NUMBER = '087758387905'; // keep as configured
  const KARAT_ORDER = ['24','23','22','21','20','19','18','17','16','15','14','13','12','11','10','9','8','7','6'];

  // DOM refs
  const pricesContainer = document.getElementById('pricesContainer');
  const lastUpdatedEl = document.getElementById('lastUpdated');
  const ctaChat = document.getElementById('ctaChat');
  const heroVideo = document.getElementById('heroVideo');
  const galleryGrid = document.getElementById('galleryGrid');
  const currentYear = document.getElementById('currentYear');

  if(currentYear) currentYear.textContent = new Date().getFullYear();

  // --- helpers ---
  function log(...args){ console.debug('[price]', ...args); }
  function warn(...args){ console.warn('[price]', ...args); }
  function err(...args){ console.error('[price]', ...args); }

  function formatIDR(n){
    if(typeof n !== 'number' || !isFinite(n)) return '-';
    return 'Rp ' + n.toLocaleString('id-ID');
  }
  function safeNumber(v){ const n = Number(v); return isNaN(n) ? 0 : n; }

  // try fetch with robust checks
  async function tryFetchJson(url){
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if(!res.ok){
        log('fetch', url, 'status', res.status);
        return null;
      }
      const text = await res.text();
      if(!text || text.trim().length === 0){
        warn('empty body from', url);
        return null;
      }
      try {
        return JSON.parse(text);
      } catch(parseErr){
        err('json parse error', url, parseErr);
        return null;
      }
    } catch(e){
      warn('fetch failed', url, e && e.message ? e.message : e);
      return null;
    }
  }

  // try multiple locations (relative, absolute, serverless)
  async function fetchPrice(){
    // 1. try relative (works for GitHub Pages under subpath)
    let data = await tryFetchJson(PRICE_JSON_REL);
    if(data) return data;

    // 2. try absolute root
    data = await tryFetchJson(PRICE_JSON_ROOT);
    if(data) return data;

    // 3. try Netlify function
    data = await tryFetchJson(FUNC_PRICE_NETLIFY);
    if(data) return data;

    // 4. try Vercel / other serverless path
    data = await tryFetchJson(FUNC_PRICE_VERCEL);
    if(data) return data;

    return null;
  }

  // Animate number UI
  function animateNumber(el, from, to, duration=650){
    from = Number(from || 0); to = Number(to || 0);
    if(!el) return;
    if(from === to){ el.textContent = formatIDR(to); return; }
    const start = performance.now();
    function step(now){
      const t = Math.min(1, (now - start) / duration);
      const val = Math.round(from + (to - from) * t);
      el.textContent = formatIDR(val);
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function createPriceCard(k, initialValue){
    const card = document.createElement('div');
    card.className = 'price-card fade-in';
    card.setAttribute('data-karat', k);
    card.innerHTML = `<h4>K${k}</h4><p class="value">${formatIDR(initialValue)}</p>`;
    return card;
  }

  function renderPriceStrip(data){
    if(!pricesContainer) return;
    pricesContainer.innerHTML = ''; // clear

    if(!data || !data.prices){
      lastUpdatedEl && (lastUpdatedEl.textContent = 'Belum ada data harga');
      return;
    }
    const prev = (window.__PRICE_CACHE__ && window.__PRICE_CACHE__.prices) ? window.__PRICE_CACHE__.prices : {};
    const prices = data.prices;

    KARAT_ORDER.forEach(k => {
      const val = safeNumber(prices[k]);
      const prevVal = safeNumber(prev[k] || val);
      const card = createPriceCard(k, prevVal);
      pricesContainer.appendChild(card);
      const valueEl = card.querySelector('.value');
      animateNumber(valueEl, prevVal, val, 700);
    });

    if(data.lastUpdated){
      try {
        const d = new Date(data.lastUpdated);
        lastUpdatedEl && (lastUpdatedEl.textContent = 'Terakhir: ' + d.toLocaleString());
      } catch(e){
        lastUpdatedEl && (lastUpdatedEl.textContent = 'Terakhir: ' + data.lastUpdated);
      }
    } else {
      lastUpdatedEl && (lastUpdatedEl.textContent = 'Terakhir: -');
    }

    window.__PRICE_CACHE__ = data;
    try { localStorage.setItem('solusiemas_price', JSON.stringify(data)); } catch(e){}
  }

  async function initPrices(){
    // instant render if cached
    try {
      const cached = JSON.parse(localStorage.getItem('solusiemas_price') || 'null');
      if(cached) renderPriceStrip(cached);
    } catch(e){}

    const data = await fetchPrice();
    if(data) renderPriceStrip(data);
    else {
      if(!window.__PRICE_CACHE__){
        pricesContainer.innerHTML = '<div style="color:#f88">Gagal memuat harga. Periksa data/price.json atau functions.</div>';
      } else {
        log('using cached price');
      }
    }
  }

  // reveal on scroll
  function initReveal(){
    try {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
      }, { threshold: 0.12 });
      document.querySelectorAll('.fade-in').forEach(el => io.observe(el));
    } catch(e){ /* no-op */ }
  }

  // lightbox for gallery
  function initLightbox(){
    const lightbox = document.getElementById('lightbox');
    const lbImg = document.getElementById('lbImg');
    const lbCaption = document.getElementById('lbCaption');
    const lbClose = document.getElementById('lbClose');
    if(!galleryGrid || !lightbox) return;
    galleryGrid.querySelectorAll('img').forEach(img => {
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbCaption.textContent = img.dataset.caption || img.alt || '';
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
      });
    });
    if(lbClose) lbClose.addEventListener('click', () => {
      lightbox.style.display = 'none';
      lbImg.src = '';
      document.body.style.overflow = '';
    });
    lightbox.addEventListener('click', (e) => { if(e.target === lightbox) lbClose && lbClose.click(); });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') lbClose && lbClose.click(); });
  }

  // hero video lazy play
  function initHeroVideo(){
    if(!heroVideo) return;
    try {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(isMobile || prefersReduced){
        heroVideo.style.display = 'none';
        return;
      }
      heroVideo.addEventListener('canplay', () => { heroVideo.style.opacity = '1'; });
      heroVideo.play().catch(()=>{ heroVideo.style.opacity = '1'; });
    } catch(e){}
  }

  // WA helper
  function buildWaLink(msg){
    let num = (WA_NUMBER || '').trim();
    if(!num) return '#';
    if(num.startsWith('0')) num = '62' + num.slice(1);
    if(num.startsWith('+')) num = num.replace('+','');
    const base = 'https://wa.me/' + num + '?text=';
    return base + encodeURIComponent(msg || 'Halo Solusi Emas, saya ingin menanyakan estimasi emas hari ini.');
  }
  function initWA(){
    if(!ctaChat) return;
    ctaChat.href = buildWaLink('Halo Solusi Emas, saya mau tanya harga emas hari ini.');
    ctaChat.target = '_blank';
  }

  function initSmoothScroll(){
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const t = a.getAttribute('href');
        if(t && t.length > 1){
          const el = document.querySelector(t);
          if(el){ e.preventDefault(); el.scrollIntoView({behavior:'smooth', block:'start'}); }
        }
      });
    });
  }

  // main init
  function init(){
    initHeroVideo();
    initWA();
    initReveal();
    initLightbox();
    initSmoothScroll();
    initPrices();
    setInterval(initPrices, POLL_INTERVAL_MS);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
