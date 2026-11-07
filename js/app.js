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
function ask(){ const q = S.z.soal[S.i]; S.tl = S.tt; S.lock = false; S.dw = [[],[]]; S.t.forEach(t => t.out = 0); $('msg').textContent = '';
  $('mt').textContent = `${S.z.judul} · Soal ${S.i+1}/${S.z.soal.length}`; $('qt').textContent = q.q;
  $('opts').innerHTML = q.o.map((o,i) => `<div class="opt" data-i="${i}"><svg viewBox="0 0 60 60"><circle class="trk" cx="30" cy="30" r="27"/><circle class="rg a" cx="30" cy="30" r="27" pathLength="100"/><circle class="rg b" cx="30" cy="30" r="21" pathLength="100"/><text x="30" y="38" text-anchor="middle">${'ABCD'[i]}</text></svg><span>${esc(o)}</span><div class="tc"><button data-t="0">1</button><button data-t="1">2</button></div></div>`).join('');
  S.el = [...document.querySelectorAll('.opt')]; S.r = S.el.map(e => e.getBoundingClientRect()); S.rg = S.el.map(e => e.querySelectorAll('.rg')); }
function score(){ S.t.forEach((t,i) => { $('n'+(i+1)).textContent = t.n; $('p'+(i+1)).textContent = t.s; $('k'+(i+1)).textContent = t.k >= 2 ? `STREAK x${t.k} 🔥` : ''; }); }
function msg(t){ $('msg').textContent = t; }
function answer(t,i){ const T = S.t[t], q = S.z.soal[S.i]; if(S.lock || T.out) return;
  if(i === q.a){ T.k++; T.c++; const p = 100+Math.round(50*S.tl/S.tt)+(T.k >= 3 ? 50 : 0); T.s += p; msg(`${T.n} BENAR! +${p}`); finish(); }
  else { T.k = 0; T.out = 1; S.el[i].classList.add('bad'); msg(`${T.n} salah`); if(S.t.every(x => x.out)) finish(); }
  score(); }
function finish(){ S.lock = true; S.el[S.z.soal[S.i].a].classList.add('ok'); if(!$('msg').textContent) msg('Waktu habis!'); setTimeout(next, 1800); }
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
  if(S.z && $('arena').classList.contains('on') && S.r){
    if(!S.lock){ S.tl -= dt/1000; $('tm').textContent = Math.max(0,Math.ceil(S.tl)); if(S.tl <= 0){ S.tl = 0; finish(); } }
    [0,1].forEach(t => { const c = cur[t], el = $('c'+(t+1)), d = S.dw[t]; if(n-c.t > 400) c.v = 0;
      el.style.opacity = c.v ? 1 : 0; el.style.transform = `translate(${c.x-22}px,${c.y-22}px)`;
      let hit = -1; if(c.v && !S.lock && !S.t[t].out) S.r.forEach((r,i) => { if(c.x>r.left && c.x<r.right && c.y>r.top && c.y<r.bottom) hit = i; });
      S.r.forEach((_,i) => { d[i] = hit === i ? (d[i]||0)+dt : Math.max(0,(d[i]||0)-dt*2); S.rg[i][t].style.strokeDashoffset = 100-Math.min(1,d[i]/CONFIG.DWELL_MS)*100; });
      if(hit >= 0 && d[hit] >= CONFIG.DWELL_MS) answer(t,hit); });
  }
  requestAnimationFrame(tick); }

$('opts').onclick = e => { const b = e.target.closest('button'); if(b && S.z) answer(+b.dataset.t, +b.closest('.opt').dataset.i); };
$('start').onclick = start; $('quiz').onchange = info; $('modeBtn').onclick = () => setTouch(!touch);
addEventListener('resize', () => { if(S.el) S.r = S.el.map(e => e.getBoundingClientRect()); });
loadQuizzes(); API.flush(); requestAnimationFrame(tick);
