# Panduan Instalasi — GestureQuiz IFP

## A. Backend (Google Apps Script)
1. Buka https://script.google.com → Proyek Baru → paste isi `Kode.gs`.
2. Pilih fungsi `setupAppEnvironment` → ▶ Run (HANYA SEKALI) → izinkan akses → cek Log ada ✅.
3. Deploy → New deployment → Web app → Execute as: **Me**, Who has access: **Anyone** → Deploy → salin URL `/exec`.
4. Buka `js/config.js`, ganti `XXXX` pada `GAS_URL` dengan URL tadi.
5. Soal diisi di Google Sheets (sheet `Kuis` dan `Soal`, kolom `benar` = A/B/C/D). Cache soal 30 menit.

## B. Frontend (GitHub Pages)
Ekstrak ZIP. Folder hasil ekstrak (yang berisi `index.html`) adalah folder tempat `git init`.
```
cd folder-hasil-ekstrak
dir          # pastikan index.html terlihat di baris atas
git init
git add .
git commit -m "Upload pertama"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```
Lalu GitHub → Settings → Pages → Deploy from branch → `main` / root. Buka `https://USERNAME.github.io/NAMA-REPO/`. Belum pernah memakai Git? Minta panduan langkah demi langkah di chat.

## C. Di IFP
Buka di Chrome (HTTPS), izinkan kamera, berdiri 1,5–2,5 m. Tim 1 di kiri, Tim 2 di kanan. Jika kamera gagal, tombol **Mode** beralih ke sentuh.

## D. Panel Admin
Klik **⚙ Admin** di pojok atas. Kata sandi dibuat otomatis saat `setupAppEnvironment` dan tampil di Execution Log (ubah di Project Settings → Script Properties → `ADMIN_PASSWORD`). Setelah mengubah Kode.gs, deploy ulang (New version).
