// Halaman admin terpisah. Kata sandi dicek server (Script Properties); sesi hanya di tab ini (sessionStorage).
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
CONFIG.DWELL_MS = +localStorage.getItem('gq_dwell') || CONFIG.DWELL_MS;
let PW = '', D = null, V = 'kuis';
const show = l => { $('login').hidden = !l; $('app').hidden = l; };
async function login(pw){ $('err').textContent = 'Memeriksa…'; const r = await API.admin('adminList',pw);
  if(!r || !r.success){ $('err').textContent = r ? r.message : 'Server belum tersambung (cek GAS_URL)'; return show(true); }
  PW = pw; D = r; sessionStorage.setItem('gq_pw',pw); show(false); render(); }
function logout(){ PW = ''; D = null; sessionStorage.removeItem('gq_pw'); $('pw').value = ''; $('err').textContent = 'Anda sudah keluar.'; show(true); }
async function reload(){ localStorage.removeItem('gq_quiz'); const r = await API.admin('adminList',PW); if(r && r.success) D = r; render(); }
function render(){
  document.querySelectorAll('nav a[data-v]').forEach(a => a.classList.toggle('on', a.dataset.v === V));
  const m = $('adm');
  if(V === 'pengaturan'){ m.innerHTML = `<h2>Pengaturan</h2><label>Waktu tahan gestur: <input id="dw" type="range" min="500" max="2500" step="100" value="${CONFIG.DWELL_MS}"> <b id="dwv">${CONFIG.DWELL_MS} ms</b></label><p>Tersimpan di perangkat ini (IFP) dan dipakai game.</p>`;
    $('dw').oninput = e => { CONFIG.DWELL_MS = +e.target.value; localStorage.setItem('gq_dwell',e.target.value); $('dwv').textContent = e.target.value+' ms'; }; }
  if(V === 'kuis'){ m.innerHTML = `<h2>Kuis (${D.quizzes.length})</h2>${D.quizzes.map(z => `<div class="card">${esc(z.judul)} · ${z.soal.length} soal · ${z.waktu}s <button data-del="${esc(z.id)}">Hapus</button></div>`).join('')}
    <h3>Tambah Kuis</h3><input id="nj" placeholder="Judul kuis"><input id="nw" type="number" value="15" style="min-width:100px"><textarea id="ns" rows="7" placeholder="Satu soal per baris:&#10;Pertanyaan | A | B | C | D | benar (A-D)"></textarea><button class="btn" id="nsave">Simpan Kuis</button>`;
    document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if(!confirm('Hapus kuis ini?')) return; await API.admin('adminDeleteQuiz',PW,b.dataset.del); reload(); });
    $('nsave').onclick = async () => { const soal = [], bad = [];
      $('ns').value.split('\n').filter(l => l.trim()).forEach((l,n) => { const p = l.split('|').map(x => x.trim()), a = 'ABCD'.indexOf((p[5]||'').toUpperCase()); if(p.length < 6 || a < 0) bad.push(n+1); else soal.push({q:p[0],o:p.slice(1,5),a}); });
      if(!$('nj').value.trim() || !soal.length || bad.length) return alert(bad.length ? 'Format salah di baris: '+bad.join(', ') : 'Isi judul dan minimal 1 soal');
      const r = await API.admin('adminSaveQuiz',PW,{judul:$('nj').value.trim(),waktu:$('nw').value,soal}); if(r && r.success) reload(); else alert('Gagal menyimpan'); }; }
  if(V === 'riwayat'){ m.innerHTML = `<h2>Riwayat Sesi</h2><button id="csv">Unduh CSV</button><table>${D.sessions.map(s => `<tr><td>${esc(String(s.tanggal).slice(0,10))}</td><td>${esc(s.tim1)} ${s.skor1}</td><td>${esc(s.tim2)} ${s.skor2}</td><td>${esc(s.pemenang)}</td></tr>`).join('')}</table>`;
    $('csv').onclick = () => { const k = ['id','id_kuis','tim1','tim2','skor1','skor2','benar1','benar2','total','pemenang','tanggal'], q = x => '"'+String(x).replace(/"/g,'""')+'"';
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[k.join(',')].concat(D.sessions.map(s => k.map(x => q(s[x])).join(','))).join('\n')],{type:'text/csv'})); a.download = 'riwayat-sesi.csv'; a.click(); }; }
}
$('go').onclick = () => login($('pw').value); $('pw').onkeydown = e => { if(e.key === 'Enter') login($('pw').value); };
$('out').onclick = logout;
document.querySelectorAll('nav a[data-v]').forEach(a => a.onclick = () => { V = a.dataset.v; render(); });
if(sessionStorage.getItem('gq_pw')) login(sessionStorage.getItem('gq_pw')); else show(true);
