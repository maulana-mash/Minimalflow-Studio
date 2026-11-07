# 📐 MinimalFlow Studio — Monochrome Flowchart Studio

Studio diagram alur kerja dan flowchart monokrom modular kelas profesional berbasis **Vanilla Web Standards** (Zero `node_modules`, ukuran < 500 KB, instan 60 FPS).

---

## ✨ Fitur & Kapabilitas Utama

1. **Zero `node_modules` (0 MB Bloat):**
   * Tidak membutuhkan instalasi npm atau bundler seperti Vite/Webpack.
   * Langsung dapat dibuka dan dijalankan langsung di peramban web (Chrome, Edge, Firefox) secara instan.
2. **Toolbar Kontekstual Melayang Bertumpuk (Two-Tier Layout):**
   * Desain 2 baris kompak tanpa scrollbar horizontal kiri-kanan.
   * **Baris 1:** Label Node, Pilihan Font (Poppins, Times New Roman, Cambria, Book Antiqua, Helvetica, Fira Code), Ukuran Font (Input Piksel Numerik + Dropdown Preset), Format Teks (Bold, Italic, Underline), Text Align (Tengah, Kiri, Kanan), Margin Horizontal Pad-X (Input Piksel + Slider), Margin Vertikal Pad-Y (Input Piksel + Slider).
   * **Baris 2:** Dimensi Lebar (W) & Tinggi (H), Palet Warna 8 Swatches + Native Hex Color Picker, Tombol Aksi Cepat: Edit Teks Langsung, Rotasi 90°, dan Kunci/Buka Posisi.
3. **Editor Teks Langsung Menyatu (Integrated Solid In-Box Text Editing):**
   * Double-click langsung pada chart membuka editor teks presisi yang menyatu sempurna ke dalam box chart (mengikuti radius geometri bentuk, warna background solid, dan ukuran batas chart).
   * *Vertical centering* otomatis dan auto-wrap per karakter untuk kata yang panjang agar tidak menembus batas bentuk.
4. **Multi-Selection & Pengelompokan Fleksibel (Grouping):**
   * **Shift + Klik**: Memilih / menambah beberapa chart ke dalam seleksi (toggle additive).
   * **Shift + Drag**: Menahan kanvas tetap diam (*zero-panning*) dan memunculkan kotak seleksi karet (*rubberband marquee*) untuk memilih banyak chart sekaligus.
   * **Ctrl + G**: Menggabungkan (*group*) chart terpilih menjadi satu kesatuan logis.
   * **Ctrl + Shift + G**: Memisahkan (*ungroup*) grup chart kembali menjadi elemen mandiri.
   * **Ctrl + A**: Memilih seluruh chart yang ada di kanvas.
   * Menggeser, menduplikat (Ctrl + D), dan menghapus (Del/Backspace) beberapa chart terpilih sekaligus secara simultan.
5. **Kabel Penghubung & Perutean Magnetik Kontras Tinggi:**
   * 4 Pin magnetik (N, E, S, W) per chart dengan orientasi normal yang adaptif terhadap rotasi bentuk.
   * 3 Mode Garis: **Siku Orthogonal (Manhattan)** dengan simplifikasi de-duplikasi zero-overshoot, **Lengkung Bezier**, dan **Lurus (Straight)**.
   * Warna kabel dan panah otomatis adaptif terhadap tema (**hitam pekat di Mode Terang** dan **putih terang di Mode Gelap**) tanpa risiko kabel menghilang atau tenggelam di kanvas.
   * Titik belokan kabel (*midpoint handle*) yang dapat digeser manual, di-reset via double-click, atau tombol reset.
   * Ketebalan garis dari **1.0 px hingga 5.0 px**.
   * Mode **Tap-to-Connect**: Sambungkan pin chart berjauhan tanpa perlu drag melintasi kanvas.
6. **Zoom Pintar Berorientasi Koordinat Kerja:**
   * Tombol Zoom In / Zoom Out di sudut kanan bawah secara dinamis memusatkan pembesaran pada chart yang sedang dipilih user atau pada titik tengah viewport aktif, bukan lagi terpaku pada origin `(0, 0)`.
7. **Unggah Foto, Ikon & Gambar:**
   * Drag & drop langsung file foto (PNG, JPG, SVG, WebP) ke kanvas atau klik tombol *Unggah Gambar* di sidebar.
8. **Multi-Project Management di LocalStorage:**
   * Klik logo **MinimalFlow Studio** di sudut kiri atas untuk membuka galeri proyek.
   * Mendukung buat alur baru, ganti nama, duplikasi, penghapusan (proteksi minimal 1 alur tersisa), dan reset contoh alur default 5 chart lengkap.
   * **Safe Filename Export**: Nama berkas hasil ekspor otomatis mengikuti nama proyek aktif dan dibersihkan dari karakter terlarang sistem operasi (`\ / : * ? " < > |`).
9. **Batas Workspace & Orientasi Kanvas:**
   * Preset rasio kanvas kerja: 16:9 Landscape (1600x900), 9:16 Portrait (900x1600), A4 Landscape, A4 Portrait, dan Persegi.
   * Tombol putar orientasi instan (*Landscape / Portrait*).
10. **Panel Impor Diagram Universal (Universal Diagram & Circuit Importer Engine):**
    * **Multi-Format Auto-Detection:** Sistem otomatis mengenali format input tanpa perlu konfigurasi manual:
      * **Modul Trainer Mashimurelay (.json):** Menerjemahkan basis data komponen (bill_of_materials) & netlist pengawatan (wiring_connections) standar DIN 72552 menjadi diagram alur skematik otomatis dengan perutean pin magnetik cerdas dan pengkabelan ground putus-putus.
      * **Script Diagram Alir Mermaid (.mmd / .mermaid):** Parsing sintaks flowchart TD/LR dan graph TD/LR, mengekstrak bangun geometri (rectangle, rounded, diamond percabangan, cylinder), teks label multilapis, serta perutean panah berjenjang (hierarchical topological layout).
      * **Generic Diagram JSON (Array):** Otomatis menormalisasi berkas JSON dari aplikasi lain yang format nodes-nya berupa array.
      * **MinimalFlow Native Document:** Kompatibilitas penuh dengan skema CAD bawaan MinimalFlow.
    * **Mekanisme Ganda (Code Editor & Reactive Drag-Drop):** Ketik/tempel kode langsung atau tarik-jatuhkan berkas .json / .mmd ke jendela modal; sistem langsung memvalidasi secara instan dengan opsi **Gantikan Seluruh Alur** atau **Gabungkan (Merge)** ke kanvas kerja aktif.
11. **AI Vision Scanner (Image-to-Flowchart Reverse Engineering):**
    * **Zero Antigravity Dependency:** Berjalan 100% mandiri di sisi peramban (client-side) tanpa perlu server lokal atau membuka Antigravity.
    * **Direct Google Gemini Vision API:** Cukup masukkan Google Gemini API Key gratis sekali, tersimpan privat di LocalStorage browser.
    * **Drag & Drop Screenshot / Foto:** Pindai screenshot alur, foto sketsa papan tulis, atau diagram PDF; AI otomatis mengekstrak struktur semantik, percabangan, subgrup kontainer, dan teks, lalu merender hasilnya menjadi diagram alur vektor interaktif di kanvas.
12. **Ekspor Multi-Format & Persistensi Tema Studio:**
   * Vektor SVG Murni (dipotong presisi sesuai batas workspace).
   * PNG Transparan 2x Retina, PNG Background Putih, JPG High Quality.
   * Dokumen PDF Vektor instan (via pustaka CDN `jspdf`).
   * Salin gambar transparan langsung ke Clipboard.
   * Simpan & Muat kembali berkas CAD `.flow.json`.
   * **Persistensi Tema Studio Global:** Mode Gelap / Terang terkunci konsisten saat berpindah proyek maupun membuat alur baru.
13. **Monokrom Murni & Bebas Emoji:**
   * 100% menggunakan ikon SVG garis geometris murni, bebas emoji Unicode.
   * Desain minimalis fungsional dengan kontras tinggi di semua kondisi pencahayaan.

---

## 🚀 Cara Menjalankan

Cukup buka berkas `index.html` langsung di peramban web Anda (Chrome / Edge / Firefox) atau jalankan melalui server lokal sederhana:

```bash
# Menggunakan Python
python -m http.server 8000

# Atau menggunakan Node / npx (opsional jika ada)
npx serve .
```
Akses di peramban: `http://localhost:8000`

---

## 📁 Struktur Berkas

```text
minimalflow-studio/
├── index.html               # Kerangka utama bersih semantik
├── favicon.svg              # Favicon geometris monokrom
├── ARCHITECTURE_SPEC.md     # Acuan spesifikasi arsitektur
├── README.md                # Dokumentasi proyek
├── css/
│   └── style.css            # Variabel warna monokrom (Light & Dark), grid, UI
└── js/
    ├── canvas.js            # Koordinat kanvas, zoom, pan, grid dots, render loop
    ├── flow_engine.js       # Logika bentuk node, pin magnetik, kawat/konektor garis
    ├── text_editor.js       # Live inline text editor (double-click di shape)
    ├── history.js           # Sistem Undo & Redo (Snapshot state stack)
    ├── projects.js          # Multi-project manager, LocalStorage, Safe export
    ├── exporter.js          # Export engine (PNG, SVG, PDF, & file .flow)
    ├── adapter.js           # Universal Translator: Mermaid (subgraph/multi-track) & Mashimurelay JSON
    ├── vision_scanner.js    # Client-side AI Vision Scanner engine (Gemini Vision API)
    └── app.js               # Orkestrator utama, toolbar, keyboard shortcuts, modal tab controller
```
