// public/js/harga.js
(async function(){
  const endpoints = ['/data/price.json','/.netlify/functions/get-price'];
  const tableBody = document.querySelector('#priceTable tbody');
  const lastUpdatedEl = document.getElementById('lastUpdated');

  async function getData(){
    for(const u of endpoints){
      try {
        const r = await fetch(u, {cache:'no-store'});
        if(r.ok) return await r.json();
      } catch(e){}
    }
    return null;
  }

  function formatIDR(n){
    try { return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(n); }
    catch(e){ return 'Rp ' + (n||0).toLocaleString(); }
  }

  const data = await getData();
  if(!data || !data.prices){
    lastUpdatedEl.textContent = 'Gagal memuat harga';
    tableBody.innerHTML = '<tr><td colspan="2">Tidak ada data</td></tr>';
    return;
  }

  const order = ['24','22','20','18','14','10','6'];
  tableBody.innerHTML = '';
  order.forEach(k=>{
    const tr = document.createElement('tr');
    const tdK = document.createElement('td'); tdK.textContent = 'K' + k;
    const tdV = document.createElement('td'); tdV.textContent = data.prices[k] ? formatIDR(data.prices[k]) : '-';
    tr.appendChild(tdK); tr.appendChild(tdV);
    tableBody.appendChild(tr);
  });
  lastUpdatedEl.textContent = 'Terakhir: ' + (data.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : '-');

})();
