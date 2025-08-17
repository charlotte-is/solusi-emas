// public/js/admin.js
(function(){
  const KARAT_ORDER = ['24','23','22','21','20','19','18','17','16','15','14','13','12','11','10','9','8','7','6'];
  const INPUT_GRID = document.getElementById('inputsGrid');
  const PREVIEW_TILES = document.getElementById('previewTiles');
  const JSON_PREVIEW = document.getElementById('jsonPreview');
  const LOADED_AT = document.getElementById('loadedAt');
  const STATUS_EL = document.getElementById('status');
  const ADMIN_KEY_INPUT = document.getElementById('adminKey');
  const SOURCE_INPUT = document.getElementById('source');

  const PRICE_JSON_REL = '../data/price.json'; // admin folder -> go up
  const PRICE_JSON_ROOT = '/data/price.json';
  const FUNC_PRICE = '/.netlify/functions/get-price';
  const UPDATE_FUNC = '/.netlify/functions/update-price';

  // Render input controls
  function renderInputs(){
    INPUT_GRID.innerHTML = '';
    KARAT_ORDER.forEach(k => {
      const wrapper = document.createElement('div');
      wrapper.className = 'field';
      wrapper.innerHTML = `
        <label for="k${k}">K${k} (Rp/gram)</label>
        <input id="k${k}" type="number" min="0" step="1" placeholder="0" />
      `;
      INPUT_GRID.appendChild(wrapper);
    });
  }

  // try multiple fetch locations
  async function tryFetchJson(url){
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if(!res.ok) return null;
      const text = await res.text();
      if(!text || text.trim().length === 0) return null;
      try { return JSON.parse(text); } catch(e){ console.error('JSON parse fail', url, e); return null; }
    } catch(e){ return null; }
  }

  async function fetchPrice(){
    let data = null;
    // admin page is at /admin/index.html so relative up ../data/price.json may work
    data = await tryFetchJson(PRICE_JSON_REL);
    if(data) return data;
    data = await tryFetchJson(PRICE_JSON_ROOT);
    if(data) return data;
    data = await tryFetchJson(FUNC_PRICE);
    if(data) return data;
    return null;
  }

  function fillInputsFromData(data){
    if(!data || !data.prices) return;
    KARAT_ORDER.forEach(k => {
      const el = document.getElementById('k' + k);
      if(el) el.value = (data.prices[k] !== undefined) ? data.prices[k] : '';
    });
    SOURCE_INPUT.value = data.source || 'manual';
    LOADED_AT.textContent = data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '-';
    renderPreviewTiles(data.prices || {});
  }

  function renderPreviewTiles(prices){
    PREVIEW_TILES.innerHTML = '';
    KARAT_ORDER.forEach(k => {
      const val = prices && prices[k] ? prices[k] : 0;
      const tile = document.createElement('div');
      tile.className = 'price-tile';
      tile.innerHTML = `<h4>K${k}</h4><div style="font-weight:700">${formatIDR(val)}</div>`;
      PREVIEW_TILES.appendChild(tile);
    });
  }

  function formatIDR(n){
    const N = Number(n || 0);
    if(isNaN(N)) return '-';
    return 'Rp ' + N.toLocaleString('id-ID');
  }

  function buildPayload(){
    const prices = {};
    KARAT_ORDER.forEach(k => {
      const el = document.getElementById('k'+k);
      const v = el && el.value ? Number(el.value) : 0;
      prices[k] = isNaN(v) ? 0 : v;
    });
    const payload = {
      prices,
      lastUpdated: new Date().toISOString(),
      source: SOURCE_INPUT.value || 'manual'
    };
    return payload;
  }

  function showStatus(ok, msg, data){
    STATUS_EL.style.display = 'block';
    STATUS_EL.className = 'status ' + (ok ? 'ok' : 'err');
    STATUS_EL.innerHTML = `<div>${msg}</div>` + (data ? `<pre style="margin-top:8px;overflow:auto;color:#dcdcdc">${JSON.stringify(data,null,2)}</pre>` : '');
  }

  async function updatePrice(){
    const key = (ADMIN_KEY_INPUT.value || '').trim();
    if(!key){
      alert('Masukkan ADMIN KEY di atas terlebih dulu.');
      return;
    }
    const payload = buildPayload();
    JSON_PREVIEW.style.display = 'block';
    JSON_PREVIEW.textContent = JSON.stringify(payload, null, 2);

    if(!confirm('Kirim update harga ke server? Pastikan ADMIN KEY benar.')) return;

    // send
    try {
      const res = await fetch(UPDATE_FUNC, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': key
        },
        body: JSON.stringify(payload)
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch(e){ json = text; }
      if(res.ok){
        showStatus(true, 'Update berhasil.', json);
        // refresh the preview tiles & loadedAt
        fillInputsFromData(payload);
      } else {
        showStatus(false, `Update gagal (HTTP ${res.status}).`, json);
      }
    } catch(e){
      showStatus(false, 'Request failed: ' + (e && e.message ? e.message : e), null);
    }
  }

  function downloadJson(){
    const payload = buildPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'price.json'; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // reset: reload from server file
  async function resetToFile(){
    const data = await fetchPrice();
    if(!data) { alert('Gagal memuat price.json untuk reset.'); return; }
    fillInputsFromData(data);
    JSON_PREVIEW.style.display = 'none';
    STATUS_EL.style.display = 'none';
  }

  // init UI
  function init(){
    renderInputs();
    JSON_PREVIEW.style.display = 'none';
    // wire buttons
    document.getElementById('btnLoad').addEventListener('click', async () => {
      const data = await fetchPrice();
      if(!data) { alert('Gagal memuat price.json (cek path atau functions)'); return; }
      fillInputsFromData(data);
      JSON_PREVIEW.style.display = 'none';
    });
    document.getElementById('btnReset').addEventListener('click', resetToFile);
    document.getElementById('btnPreview').addEventListener('click', () => {
      const payload = buildPayload();
      JSON_PREVIEW.style.display = 'block';
      JSON_PREVIEW.textContent = JSON.stringify(payload, null, 2);
    });
    document.getElementById('btnUpdate').addEventListener('click', updatePrice);
    document.getElementById('btnDownload').addEventListener('click', downloadJson);

    // load on open
    (async ()=>{
      const data = await fetchPrice();
      if(data) fillInputsFromData(data);
      else {
        // try local storage fallback
        try {
          const cached = JSON.parse(localStorage.getItem('solusiemas_price') || 'null');
          if(cached) fillInputsFromData(cached);
        } catch(e){}
      }
    })();
  }

  // run
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
