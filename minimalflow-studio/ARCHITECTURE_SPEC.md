# 📐 Spesifikasi Arsitektur: MinimalFlow Studio (Modular Vanilla JS)
**Model Arsitektur Bergaya Mashimurelay: Zero Node Modules, Ultra-Lightweight (<500 KB), & Instant 60 FPS**

---

## 1. Filosofi & Prinsip Utama

Dokumen ini adalah acuan resmi untuk merekonstruksi **MinimalFlow Studio** dari file monolitik lama (`minimalflow.html`) menjadi arsitektur modular murni (**Vanilla Web Standards**) tanpa framework dan tanpa bundler:

1. **Zero `node_modules` (0 MB Bloat):** Tidak memerlukan instalasi npm, Vite, Webpack, atau perkakas compiler yang memakan ratusan megabyte.
2. **Ukuran Proyek Sangat Ringan (< 500 KB):** Seluruh kode program, style, dan aset berukuran ringkas, hemat memori, dan instan dibuka.
3. **Pemisahan Modul Bersih (Separation of Concerns):** Setiap logika (kanvas, shape diagram, editor teks, manajemen proyek, dan ekspor) berada di filenya masing-masing.
4. **Instan Dijalankan:** Cukup buka `index.html` langsung di browser Chrome/Edge/Firefox atau jalankan lewat local server sederhana (`python -m http.server`).
5. **Siap Dibungkus ke Desktop (`.exe`):** Struktur folder ini kompatibel 100% jika di kemudian hari ingin dikemas menjadi aplikasi desktop Windows via Tauri (seperti `simurelay-windows`).

---

## 2. Struktur Folder & Tata Letak Berkas

```text
minimalflow-studio/
├── index.html               # Kerangka utama bersih (~180 baris)
├── favicon.svg              # Favicon geometris monokrom
├── css/
│   └── style.css            # Variabel warna monokrom (Light & Dark), grid, UI
├── js/
│   ├── canvas.js            # Koordinat kanvas, zoom, pan, grid dots, render loop
│   ├── flow_engine.js       # Logika bentuk node, pin magnetik, kawat/konektor garis
│   ├── text_editor.js       # Live inline text editor (double-click di shape)
│   ├── history.js           # Sistem Undo & Redo (Snapshot state stack)
│   ├── projects.js          # Multi-project manager, LocalStorage, Safe export
│   ├── exporter.js          # Export engine (PNG, SVG, PDF, & file .flow)
│   └── app.js               # Orkestrator utama, toolbar, keyboard shortcuts, modal
└── assets/
    └── icons/               # Ikon SVG monokrom geometris murni (Zero Emojis)
```

---

## 3. Spesifikasi Rinci Setiap Modul

### A. `index.html` — *Kerangka Bersih*
* Hanya berisi struktur dasar DOM semantik:
  * Container toolbar atas (Brand multi-proyek, Undo, Redo, Workspace Preset & Orientation, Clear, Theme Switch, Open JSON, Export Dropdown).
  * Area kanvas kerja utama (`<svg id="canvas-svg">`).
  * Floating contextual property palette (Two-tier stacked bar: font, ukuran, B/I/U, align, pad-x/y, W/H, 8 warna + picker, rotate, lock).
  * Floating edge contextual bar (orthogonal, bezier, straight, markers, stroke-width, dash, reset handle).
  * Modal drawer galeri proyek (New Project, Duplicate, Rename, Delete, Reset Default).
* Memuat skrip secara berurutan di akhir tag `<body>`:
  ```html
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="js/canvas.js"></script>
  <script src="js/flow_engine.js"></script>
  <script src="js/text_editor.js"></script>
  <script src="js/history.js"></script>
  <script src="js/projects.js"></script>
  <script src="js/exporter.js"></script>
  <script src="js/app.js"></script>
  ```

### B. `css/style.css` — *Sistem Estetika Monokrom Murni*
* Mempertahankan token variabel CSS monokrom:
  * **Light Mode:** `--bg-page: #fafafa;`, `--bg-surface: #ffffff;`, `--border-color: #e4e4e7;`, `--text-main: #18181b;`
  * **Dark Mode (`body.dark-mode`):** `--bg-page: #09090b;`, `--bg-surface: #18181b;`, `--border-color: #3f3f46;`, `--text-main: #f4f4f5;`
* **Zero Emojis:** Semua ikon antarmuka menggunakan garis geometris SVG.
* Toolbar melayang bertumpuk 2 baris (Two-Tier Layout) kompak tanpa scrollbar horizontal.

### C. `js/canvas.js` — *Canvas & Coordinate Engine*
* Mengelola transformasi koordinat layar ke koordinat kanvas:
  * `screenToWorld(clientX, clientY)`
  * `worldToScreen(worldX, worldY)`
* Mengatur tingkat `zoom` (0.2x hingga 3.5x via scroll mouse / pinch gesture) dan `pan` (drag dengan tombol tengah mouse atau drag canvas kosong).
* Menggambar grid titik (*dotted grid*) monokrom dan kotak batas workspace kanvas ekspor.

### D. `js/flow_engine.js` — *Shape, Connector, & Magnetics*
* **Node Factory:** Membuat objek Node (Process / Kotak, Decision / Belah Ketupat, Terminator / Kapsul, Lingkaran, Parallelogram / Data I/O, Silinder / Database, Segitiga, dan Upload Gambar).
* **Magnetic Snapping:** Setiap shape memiliki 4 titik pin magnetik (N, E, S, W) yang menghormati rotasi shape.
* **Line Router:**
  * Siku-siku (*orthogonal Manhattan*) dengan de-duplikasi zero-overshoot points.
  * Kurva luwes (*bezier*).
  * Garis lurus (*straight*).
  * Ketebalan garis standar: `1.0px`, `1.5px`, `2.0px`, `2.5px`, `3.0px`, `4.0px`, `5.0px`.
  * Opsi garis putus-putus (*dashed*, *dotted*) dan panah (*markerStart*, *markerEnd*).

### E. `js/text_editor.js` — *Inline Text Editor*
* Mengatur *live text editing* saat shape di-double click.
* Posisi textarea langsung dihitung dari koordinat lokal node dengan *vertical centering* otomatis.
* Pemecahan per-karakter kata panjang agar tidak keluar batas visual geometri chart.
* Kontrol keyboard: `Enter` commit, `Shift+Enter` baris baru, `Escape` batalkan.

### F. `js/projects.js` — *Project Manager & Safe Naming (Standar Mashimurelay)*
* Persistensi multi-proyek di `localStorage` dengan kunci terstruktur: `minimalflow_projects_v2`.
* Fitur: buat alur baru, duplikat, rename, delete (proteksi minimal 1 alur tersisa), muat alur contoh default (5 chart alur lengkap).
* **Safe Filename Export:** Menghindari karakter terlarang sistem operasi (`\ / : * ? " < > |`) dan tanpa timestamp acak.

### G. `js/exporter.js` — *Export Engine*
* **Export .flow.json:** Menyimpan seluruh data diagram CAD.
* **Export .svg:** Vektor SVG murni berdasarkan bounding box workspace.
* **Export .png:** Render kanvas ke gambar raster 2x Retina (Transparan & Background Putih).
* **Export .jpg:** Gambar JPEG 2x kualitas tinggi.
* **Export .pdf:** Dokumen PDF instan via pustaka `jspdf.umd.min.js`.
* **Salin ke Clipboard:** Menyalin gambar transparan langsung ke clipboard sistem operasi.

### H. `js/app.js` — *Master Controller*
* Inisialisasi seluruh komponen saat `DOMContentLoaded`.
* Menangani keyboard shortcuts global:
  * `Ctrl + Z` : Undo
  * `Ctrl + Y` / `Ctrl + Shift + Z` : Redo
  * `Ctrl + C` : Salin chart
  * `Ctrl + V` : Tempel chart
  * `Ctrl + D` : Duplikat chart
  * `Delete` / `Backspace` : Hapus shape atau garis terpilih
  * `Escape` : Batalkan penarikan garis aktif / deselect / tutup modal
* Sinkronisasi status mode gelap/terang ke `localStorage`.
