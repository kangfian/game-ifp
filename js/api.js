// Semua panggilan ke GAS (REST). POST wajib text/plain agar tanpa preflight CORS.
const API = {
  ok(){ return CONFIG.GAS_URL && !CONFIG.GAS_URL.includes('XXXX'); },
  async get(a){ if(!API.ok()) return null;
    try{ const j = await (await fetch(CONFIG.GAS_URL+'?action='+a)).json(); return j.success ? j.data : null; }catch(e){ return null; } },
  save(rec){ const q = JSON.parse(localStorage.getItem('gq_q')||'[]'); q.push(rec);
    localStorage.setItem('gq_q', JSON.stringify(q)); API.flush(); },   // antre lokal, kirim di latar belakang
  async flush(){ const q = JSON.parse(localStorage.getItem('gq_q')||'[]'); if(!q.length||!API.ok()) return;
    try{ const r = await fetch(CONFIG.GAS_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'saveSessions',data:q})});
      if((await r.json()).success) localStorage.removeItem('gq_q'); }catch(e){} }
};
