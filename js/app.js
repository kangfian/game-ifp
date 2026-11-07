const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const DEMO = [{id:'demo',judul:'Informatika - Kelas 1',waktu:15,soal:[
 {q:'Penyimpanan data acak sementara?',o:['HDD','RAM','ROM','PSU'],a:1},
 {q:'Memori permanen berisi instruksi booting awal?',o:['RAM','Flashdisk','ROM','DVD'],a:2},
 {q:'Konverter arus AC ke DC pada komputer?',o:['PSU','RAM','CPU','HDD'],a:0}]}];
let quizzes = DEMO, S = {}, hands, cam = false, busy = false, touch = false;
const cur = [{x:0,y:0,v:0,t:0},{x:0,y:0,v:0,t:0}];
const go = id => document.querySelectorAll('section').forEach(s => s.classList.toggle('on', s.id === id));

// ---- Data kuis: tampil instan dari cache lokal, lalu segarkan dari server (stale-while-revalidate)
function fill(){ const i = $('quiz').selectedIndex;
  $('quiz').innerHTML = quizzes.map(z => `<option>${esc(z.judul)}</option>`).join('');
  $('quiz').selectedIndex = Math.max(0,i); info(); }
function info(){ const z = quizzes[$('quiz').selectedIndex]||quizzes[0]; $('qinfo').textContent = `${z.soal.length} soal · ${z.waktu||15} detik/soal`; }
async function loadQuizzes(){
  try{ quizzes = JSON.parse(localStorage.getItem('gq_quiz')) || DEMO; }catch(e){}
  fill(); const d = await API.get('getQuizzes');
  if(d && d.length){ quizzes = d; localStorage.setItem('gq_quiz', JSON.stringify(d)); fill(); }
}

// ---- Kamera + MediaPipe Hands (berjalan di browser, ringan: modelComplexity 0)
async function initCam(){
  if(cam || touch) return;
  try{
    if(typeof Hands === 'undefined') throw 0;
    const v = $('v'); v.srcObject = await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'}}); await v.play();
    hands = new Hands({locateFile: f => 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/'+f});
    hands.setOptions({maxNumHands:4,modelComplexity:0,minDetectionConfidence:.6,minTrackingConfidence:.5});
    hands.onResults(onHands); cam = true; $('st').textContent = 'Kamera: aktif'; feed();
  }catch(e){ setTouch(true); }
}
async function feed(){ if(cam && !busy){ busy = true; try{ await hands.send({image:$('v')}); }catch(e){} busy = false; } requestAnimationFrame(feed); }
function onHands(r){ const seen = [0,0], now = performance.now();
  (r.multiHandLandmarks||[]).forEach(h => { const p = h[8], x = (1-p.x)*innerWidth, y = p.y*innerHeight, t = x < innerWidth/2 ? 0 : 1;
    if(seen[t]) return; seen[t] = 1; const c = cur[t];
    c.x = c.v ? c.x+(x-c.x)*.4 : x; c.y = c.v ? c.y+(y-c.y)*.4 : y; c.v = 1; c.t = now; }); }
function setTouch(on){ touch = on; document.body.classList.toggle('touch', on);
  $('modeBtn').textContent = 'Mode: '+(on?'Sentuh':'Gesture'); if(on) $('st').textContent = 'Kamera: mati (mode sentuh)'; else initCam(); }

// ---- Alur permainan
function start(){
  const z = quizzes[$('quiz').selectedIndex] || quizzes[0], T = (id,d) => ({n:$(id).value.trim()||d,s:0,k:0,c:0,out:0});
  S = {z,i:0,tt:z.waktu||15,tl:0,lock:true,dw:[[],[]],t:[T('t1','Tim 1'),T('t2','Tim 2')]};
  go('arena'); score(); initCam(); ask();
}
function ask(){ const q = S.z.soal[S.i]; S.tl = S.tt; S.lock = false; S.dw = [{},{}]; S.t.forEach(t => t.out = 0); $('msg').textContent = '';
  $('mt').textContent = `${S.z.judul} · Soal ${S.i+1}/${S.z.soal.length}`; $('qt').textContent = q.q;
  const W = innerWidth/2, lane = [0,1,2,3].sort(() => Math.random()-.5), w = Math.max(100,Math.min(140,W/5)); S.b = [];
  $('opts').innerHTML = [0,1].map(t => q.o.map((o,i) => `<div class="bub ${t?'b':'a'}" data-t="${t}" data-i="${i}" style="width:${w}px;height:${w}px"><svg viewBox="0 0 60 60"><circle class="rg" cx="30" cy="30" r="29" pathLength="100"/></svg><b>${'ABCD'[i]}</b><span>${esc(o)}</span></div>`).join('')).join('');
  S.el = [...document.querySelectorAll('.bub')];   // 4 gelembung per tim, jawaban sama, jatuh dari atas
  S.el.forEach(el => { const t = +el.dataset.t, i = +el.dataset.i; S.b.push({el,t,i,w,x:t*W+10+lane[i]*((W-w-20)/3),y:-w-i*170-Math.random()*100,v:50+Math.random()*25,rg:el.querySelector('.rg')}); }); }
function score(){ S.t.forEach((t,i) => { $('n'+(i+1)).textContent = t.n; $('p'+(i+1)).textContent = t.s; $('k'+(i+1)).textContent = t.k >= 2 ? `STREAK x${t.k} 🔥` : ''; }); }
function msg(t){ $('msg').textContent = t; }
function answer(t,i){ const T = S.t[t], q = S.z.soal[S.i]; if(S.lock || T.out) return;
  if(i === q.a){ T.k++; T.c++; const p = 100+Math.round(50*S.tl/S.tt)+(T.k >= 3 ? 50 : 0); T.s += p; msg(`${T.n} BENAR! +${p}`); finish(); }
  else { T.k = 0; T.out = 1; S.b.find(b => b.t === t && b.i === i).el.classList.add('bad'); msg(`${T.n} salah`); if(S.t.every(x => x.out)) finish(); }
  score(); }
function finish(){ S.lock = true; S.b.filter(b => b.i === S.z.soal[S.i].a).forEach(b => b.el.classList.add('ok')); if(!$('msg').textContent) msg('Waktu habis!'); setTimeout(next, 1800); }
function next(){ if(++S.i >= S.z.soal.length) end(); else ask(); }
function end(){ const [a,b] = S.t, w = a.s === b.s ? 'Seri' : (a.s > b.s ? a.n : b.n);
  const rec = {id:'S'+Date.now(),kuis:S.z.id||'',judul:S.z.judul,t1:a.n,t2:b.n,s1:a.s,s2:b.s,benar1:a.c,benar2:b.c,total:S.z.soal.length,menang:w,tgl:new Date().toISOString()};
  let h = []; try{ h = JSON.parse(localStorage.getItem('gq_hist')||'[]'); }catch(e){}
  h.unshift(rec); h = h.slice(0,10); localStorage.setItem('gq_hist', JSON.stringify(h)); API.save(rec);   // simpan lokal dulu, server di latar belakang
  $('hasil').innerHTML = `<h1>🏆 ${w==='Seri'?'Seri!':esc(w)+' Menang!'}</h1><div class="res"><div>${esc(a.n)}<b style="color:#38BDF8">${a.s}</b>${a.c}/${rec.total} benar</div><div>${esc(b.n)}<b style="color:#F97316">${b.s}</b>${b.c}/${rec.total} benar</div></div>
  <div><button class="btn" id="again">Main Lagi</button> <button class="btn" id="home" style="background:#2B3A9E;color:#fff">Beranda</button></div>
  <table><tr><th>Tanggal</th><th>Kuis</th><th>Skor</th><th>Pemenang</th></tr>${h.map(r => `<tr><td>${new Date(r.tgl).toLocaleDateString('id-ID')}</td><td>${esc(r.judul)}</td><td>${r.s1} - ${r.s2}</td><td>${esc(r.menang)}</td></tr>`).join('')}</table>`;
  go('hasil'); $('again').onclick = start; $('home').onclick = () => go('beranda'); }

// ---- Loop render 60fps: kursor, timer, dwell ring (hanya transform/stroke → ringan di GPU)
let last = 0;
function tick(n){ const dt = Math.min(n-last,100); last = n;
  if(S.z && S.b && $('arena').classList.contains('on')){
    if(!S.lock){ S.tl -= dt/1000; $('tm').textContent = Math.max(0,Math.ceil(S.tl)); if(S.tl <= 0){ S.tl = 0; finish(); } }
    S.b.forEach(b => { if(!S.lock){ b.y += b.v*dt/1000; if(b.y > innerHeight) b.y = -b.w; } b.el.style.transform = `translate(${b.x}px,${b.y}px)`; });
    [0,1].forEach(t => { const c = cur[t], el = $('c'+(t+1)), d = S.dw[t]; if(n-c.t > 400) c.v = 0;
      el.style.opacity = c.v ? 1 : 0; el.style.transform = `translate(${c.x-22}px,${c.y-22}px)`;
      S.b.forEach(b => { if(b.t !== t) return;
        const hit = c.v && !S.lock && !S.t[t].out && Math.hypot(c.x-b.x-b.w/2, c.y-b.y-b.w/2) < b.w/2+15;
        d[b.i] = hit ? (d[b.i]||0)+dt : Math.max(0,(d[b.i]||0)-dt*2);
        b.rg.style.strokeDashoffset = 100-Math.min(1,d[b.i]/CONFIG.DWELL_MS)*100;
        if(hit && d[b.i] >= CONFIG.DWELL_MS) answer(t,b.i); }); });
  }
  requestAnimationFrame(tick); }

$('opts').onclick = e => { const b = e.target.closest('.bub'); if(b && S.z) answer(+b.dataset.t, +b.dataset.i); };
$('start').onclick = start; $('quiz').onchange = info; $('modeBtn').onclick = () => setTouch(!touch);
loadQuizzes(); API.flush(); requestAnimationFrame(tick);

// ---- Panel Admin (kata sandi disimpan di Script Properties server, bukan di kode)
CONFIG.DWELL_MS = +localStorage.getItem('gq_dwell') || CONFIG.DWELL_MS;
let PW = '';
const loginBox = m => { $('adm').innerHTML = `<h2>Login Admin</h2><p>${esc(m||'')}</p><input id="pw" type="password" placeholder="Kata sandi admin"><button class="btn" id="login">Masuk</button>`;
  $('login').onclick = () => { PW = $('pw').value; adminLoad(); }; };
$('adminBtn').onclick = () => { go('admin'); PW ? adminLoad() : loginBox(); };
async function adminLoad(){
  $('adm').innerHTML = '<p>Memuat…</p>'; const r = await API.admin('adminList',PW);
  if(!r || !r.success){ PW = ''; return loginBox(r ? r.message : 'Server belum tersambung (cek GAS_URL)'); }
  $('adm').innerHTML = `<h2>Panel Admin</h2><h3>Pengaturan</h3><label>Waktu tahan gestur: <input id="dw" type="range" min="500" max="2500" step="100" value="${CONFIG.DWELL_MS}"> <b id="dwv">${CONFIG.DWELL_MS} ms</b></label>
  <h3>Kuis (${r.quizzes.length})</h3>${r.quizzes.map(z => `<div class="card">${esc(z.judul)} · ${z.soal.length} soal · ${z.waktu}s <button data-del="${esc(z.id)}">Hapus</button></div>`).join('')}
  <h3>Tambah Kuis</h3><input id="nj" placeholder="Judul kuis"><input id="nw" type="number" value="15" style="min-width:100px"><textarea id="ns" rows="6" placeholder="Satu soal per baris:&#10;Pertanyaan | A | B | C | D | benar (A-D)"></textarea><button class="btn" id="nsave">Simpan Kuis</button>
  <h3>Riwayat Sesi</h3><button id="csv">Unduh CSV</button><table>${r.sessions.map(s => `<tr><td>${esc(String(s.tanggal).slice(0,10))}</td><td>${esc(s.tim1)} ${s.skor1}</td><td>${esc(s.tim2)} ${s.skor2}</td><td>${esc(s.pemenang)}</td></tr>`).join('')}</table>`;
  $('dw').oninput = e => { CONFIG.DWELL_MS = +e.target.value; localStorage.setItem('gq_dwell',e.target.value); $('dwv').textContent = e.target.value+' ms'; };
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if(!confirm('Hapus kuis ini?')) return; await API.admin('adminDeleteQuiz',PW,b.dataset.del); await refresh(); });
  $('nsave').onclick = async () => { const soal = [], bad = [];
    $('ns').value.split('\n').filter(l => l.trim()).forEach((l,n) => { const p = l.split('|').map(x => x.trim()), a = 'ABCD'.indexOf((p[5]||'').toUpperCase()); if(p.length < 6 || a < 0) bad.push(n+1); else soal.push({q:p[0],o:p.slice(1,5),a}); });
    if(!$('nj').value.trim() || !soal.length || bad.length) return alert(bad.length ? 'Format salah di baris: '+bad.join(', ') : 'Isi judul dan minimal 1 soal');
    const r2 = await API.admin('adminSaveQuiz',PW,{judul:$('nj').value.trim(),waktu:$('nw').value,soal}); if(r2 && r2.success) await refresh(); else alert('Gagal menyimpan'); };
  $('csv').onclick = () => { const k = ['id','id_kuis','tim1','tim2','skor1','skor2','benar1','benar2','total','pemenang','tanggal'];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[k.join(',')].concat(r.sessions.map(s => k.map(x => '"'+String(s[x]).replace(/"/g,'""')+'"').join(','))).join('\n')],{type:'text/csv'})); a.download = 'riwayat-sesi.csv'; a.click(); };
}
async function refresh(){ localStorage.removeItem('gq_quiz'); await loadQuizzes(); adminLoad(); }
