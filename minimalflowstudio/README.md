# 📐 MinimalFlow Studio — Monochrome Flowchart & Workflow Studio

Aplikasi studio diagram alur kerja dan flowchart monokrom modular kelas profesional berbasis **Vite + Svelte 5 (Runes) + TypeScript + jsPDF**.

Proyek ini merupakan hasil migrasi, refactoring, dan rekonstruksi menyeluruh dari berkas tunggal monolitik `minimalflow.html` menjadi arsitektur web modern yang terisolasi, berkategori type-safe, berkinerja tinggi (60 FPS), dan memiliki estetika **Monokrom Murni (Zero Emojis)**.

---

## ✨ Fitur & Peningkatan Utama

1. **Toolbar Melayang Bertumpuk (Two-Tier Layout):**
   * Panel toolbar mengambang (`FloatingProperties.svelte`) dirancang dengan layout **2 baris bertumpuk** yang kompak dan rapi sehingga **tidak ada lagi scrollbar horizontal kiri-kanan** yang mengganggu.
   * **Baris 1:** Label Node, Font Family (Poppins, Inter, Fira Code), Font Size (**Input Piksel Numerik + Select Berdampingan**), Format Teks (Bold, Italic, Underline), Text Align (Tengah, Kiri, Kanan), Margin Horizontal Pad-X (**Input Piksel Numerik + Slider Berdampingan**), Margin Vertikal Pad-Y (**Input Piksel Numerik + Slider Berdampingan**).
   * **Baris 2:** Dimensi Lebar (W) & Tinggi (H), Palet Warna 8 Swatches + Color Picker Bebas, Tombol Aksi Cepat: Edit Teks Langsung, Rotasi 90°, dan Kunci/Buka Posisi.
2. **Native Direct In-Chart Text Editing:**
   * Double-click langsung pada chart atau klik opsi di menu konteks akan membuka editor teks in-place transparan tepat di atas shape kanvas.
   * Sinkronisasi visual instan saat mengetik, *vertical centering* otomatis, dan *auto-capitalization* untuk huruf pertama.
   * Teks placeholder halus `"Insert text"` dengan opacity halus 0.45 saat kosong.
   * Algoritma pemecahan per-karakter otomatis (*character-level wrap*) untuk kata panjang yang tidak memiliki spasi agar tidak tembus keluar batas geometri chart.
3. **Kabel Penghubung & Perutean Magnetik:**
   * 3 Mode Garis: **Siku Orthogonal (Manhattan)** dengan simplifikasi de-duplikasi zero-overshoot, **Lengkung Bezier**, dan **Lurus (Straight)**.
   * Pengaturan ketebalan kabel dari **1.0 px hingga 5.0 px**.
   * Penyesuaian gaya solid dan putus-putus (*dashed*).
   * Pilihan panah ujung di awal (*markerStart*) dan di akhir (*markerEnd*).
   * Mode **Tap-to-Connect**: Hubungkan pin magnetik chart yang berjauhan hanya dengan sekali tap tanpa harus melakukan drag melintasi kanvas.
4. **Unggah Foto, Ikon & Gambar:**
   * Dukungan *drag and drop* langsung file foto (PNG, JPG, SVG) dari file explorer ke kanvas dengan penskalaan otomatis yang proporsional.
   * Tombol *Unggah Gambar* di sidebar untuk memilih file secara langsung.
5. **Menu Klik Kanan Kontekstual:**
   * Menyediakan aksi cepat: Edit Teks, Salin (Ctrl+C), Tempel (Ctrl+V), Duplikat, Kunci/Buka Kunci Posisi, Rotasi 90°, dan Hapus (Del).
6. **Multi-Project Management di LocalStorage:**
   * Mengklik logo **MinimalFlow Studio** di sudut kiri atas akan membuka modal galeri proyek.
   * Mendukung pembuatan alur baru, ganti nama (*rename*), duplikasi alur, dan penghapusan dengan persistensi otomatis ke `localStorage`.
7. **Batas Workspace & Orientasi Kanvas:**
   * Pilihan rasio preset: 16:9 Landscape, 9:16 Portrait, A4 Landscape, A4 Portrait, dan Persegi (Square).
   * Tombol pengubah orientasi instan (*Landscape / Portrait*).
   * Garis putus-putus halus penanda batas area kanvas kerja yang menjadi acuan ekspor dokumen final.
8. **Ekspor Multi-Format:**
   * Ekspor Vektor SVG murni berdasarkan bounding box workspace.
   * PNG Transparan beresolusi tinggi (2x).
   * PNG Background Kanvas Putih.
   * JPG 2x High Quality.
   * Dokumen PDF Vektor instan via library `jspdf`.
   * Salin gambar transparan langsung ke Clipboard komputer.
   * Simpan & Muat kembali file project `.flow.json`.
9. **Zero Emojis & Pure Monochrome:**
   * 100% bebas dari emoji Unicode. Seluruh antarmuka menggunakan ikon SVG monokrom geometris yang konsisten pada Light Theme maupun Dark Mode.

---

## 📁 Struktur Direktori Modular

```text
minimalflow-studio/
├── index.html                       # Shell HTML & typography webfonts
├── package.json                     # Vite, Svelte 5, TypeScript, jsPDF
├── vite.config.ts                   # Konfigurasi bundler Vite
├── tsconfig.json                    # Konfigurasi compiler TypeScript
├── public/
│   └── favicon.svg                  # Icon geometris monokrom
└── src/
    ├── App.svelte                   # Root orchestrator state, keyboard shortcuts & dialogs
    ├── main.ts                      # Entry point mount aplikasi
    ├── app.css                      # Import sentral token styles
    │
    ├── types/                       # Definisi type TypeScript
    │   ├── node.ts                  # Tipe FlowNode, NodeType, MagneticPin, NodeText
    │   ├── connector.ts             # Tipe FlowConnector, LineStyle, MarkerType
    │   ├── project.ts               # Tipe FlowDocument, FlowWorkspace, FlowProjectItem
    │   └── index.ts                 # Export barrel
    │
    ├── engine/                      # Logika matematika & manipulasi kanvas
    │   ├── canvasRenderer.ts        # Matriks transformasi koordinat, zoom/pan, SVG shape paths
    │   ├── magneticEngine.ts        # Deteksi pin magnetik N/E/S/W & kalkulasi sudut rotasi
    │   ├── lineRouter.ts            # Manhattan orthogonal routing & midpoint handle calculation
    │   ├── textLayout.ts            # Canvas text measure, vertical centering, word & char auto-wrap
    │   ├── historyManager.ts        # Undo/Redo snapshot stack (kedalaman 40 state)
    │   ├── storage.ts               # Multi-project CRUD & debounce autosave di localStorage
    │   └── exporter.ts              # Ekspor SVG, PNG, JPG, PDF (jsPDF), dan JSON
    │
    ├── components/                  # Komponen Svelte Modular
    │   ├── ToolbarHeader.svelte     # Bar atas (Projects modal, Undo/Redo, Presets, Export, Theme)
    │   ├── SidebarShapes.svelte     # Panel kiri (Daftar bentuk bagan & tombol upload gambar)
    │   ├── CanvasViewport.svelte    # Kanvas SVG interaktif, grid, dragging, wires, pins, resizing
    │   ├── FloatingProperties.svelte# Toolbar melayang bertumpuk (2 baris tanpa scrollbar!)
    │   ├── InlineTextEditor.svelte  # Live direct in-chart transparent textarea editor
    │   ├── ContextMenu.svelte       # Menu klik kanan (Copy, Paste, Duplicate, Lock, Rotate, Del)
    │   └── ProjectModal.svelte      # Dialog drawer galeri proyek tersimpan
    │
    └── styles/
        ├── variables.css            # Token CSS variabel monokrom (Light & Dark theme)
        ├── global.css               # Reset CSS, tata letak antarmuka, dan toast
        └── canvas.css               # Styling SVG nodes, handles, pins, dan boundary
```

---

## 🚀 Panduan Menjalankan Aplikasi

Pastikan Node.js telah terpasang di sistem. Jalankan perintah berikut di terminal:

```bash
# 1. Pindah ke direktori proyek
cd "C:\Users\Mash_Maulana\.gemini\antigravity\scratch\monochrome-flowchart\minimalflow-studio"

# 2. Jalankan local development server dengan Hot Module Replacement (HMR)
npm.cmd run dev
```

Server akan aktif pada alamat lokal (biasanya `http://localhost:5173`). Buka URL tersebut di browser web Google Chrome untuk mulai mendesain alur kerja flowchart Anda!

Untuk memverifikasi kompilasi bundel produksi:
```bash
npm.cmd run build
```
Build akan menghasilkan berkas teroptimasi di folder `dist/` secara instan tanpa error.
