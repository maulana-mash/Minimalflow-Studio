# 📐 Spesifikasi Arsitektur & Panduan Migrasi: MinimalFlow Studio
**Dari Monolith Single-File (`minimalflow.html`) ke Modern Web Architecture (Svelte 5 + TypeScript)**

---

## 1. Ringkasan Eksekutif & Tujuan

* **Kondisi Eksisting:** Berkas `minimalflow.html` adalah berkas tunggal monolitik (~3.962 baris kode) yang menggabungkan HTML, CSS variabel, dan JavaScript DOM imperatif dalam satu file.
* **Tujuan Rekayasa Ulang:** Memecah proyek menjadi arsitektur web modern yang modular, berkinerja tinggi (60 FPS), *type-safe*, mudah dirawat, dengan estetika **Monokrom Murni (Zero Emojis)** berbasis **Vite + Svelte + TypeScript**.
* **Lingkup Platform:** Web Murni (Client-Side Only / Statis, tanpa backend server, persistensi via `localStorage`).

---

## 2. Pilihan Stack Teknologi yang Dipilih

| Lapisan | Teknologi | Alasan Pemilihan |
|---|---|---|
| **Bundler & Build Tool** | **Vite** | Kompilasi ultra-cepat, Hot Module Replacement (HMR) instan. |
| **Framework UI** | **Svelte 5 (Runes)** | Zero Virtual DOM overhead, ukuran bundel sangat kecil (~15 KB), performa reaktif murni cocok untuk kanvas. |
| **Bahasa Utama** | **TypeScript** | *Type safety* mutlak untuk struktur graph node, pin koordinat, dan konektor garis. |
| **Styling & Tema** | **CSS Variables + Modular CSS** | Mempertahankan identitas monokrom (Light/Dark Mode, palet Zinc/Neutral). |
| **PDF Exporter** | **jspdf** | Ekspor dokumen diagram ke PDF berkualitas vektor. |

---

## 3. Rancangan Struktur Direktori (Folder Tree)

```text
minimalflow-studio/
├── index.html                  # Shell HTML utama (bersih & ringkas)
├── package.json                # Dependensi (Vite, Svelte, TypeScript, jsPDF)
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
├── public/
│   ├── favicon.svg
│   └── fonts/                  # Inter, Fira Code, Poppins (opsional offline)
└── src/
    ├── app.d.ts
    ├── App.svelte              # Komponen root orkestrator
    ├── main.ts                 # Entry point aplikasi
    │
    ├── types/                  # Definisi Tipe Data Diagram (TypeScript)
    │   ├── node.ts             # Tipe Node (Process, Decision, Terminator, Image)
    │   ├── connector.ts        # Tipe Line, Pin Magnetik, Waypoints
    │   └── project.ts          # Tipe Proyek, Kanvas, dan Riwayat Undo/Redo
    │
    ├── engine/                 # Logika Matematika & Kanvas (Framework-Agnostic)
    │   ├── canvasRenderer.ts   # Transformasi matriks, zoom, pan, grid dots
    │   ├── magneticEngine.ts   # Deteksi pin magnetik & snapping koordinat
    │   ├── lineRouter.ts       # Kalkulasi garis lurus, kurva bezier, orthogonal
    │   ├── historyManager.ts   # Tumpukan Undo & Redo (Snapshot state)
    │   └── exporter.ts         # Logika ekspor ke JSON, SVG, PNG, dan PDF
    │
    ├── components/             # Komponen Antarmuka Svelte
    │   ├── CanvasViewport.svelte    # Kanvas kerja utama (SVG + HTML Layer)
    │   ├── ToolbarHeader.svelte     # Bar navigasi atas (New, Open, Export, Theme)
    │   ├── FloatingProperties.svelte# Palet melayang (Font, tebal garis, panah)
    │   ├── ContextMenu.svelte       # Menu klik kanan pada elemen
    │   ├── ProjectModal.svelte      # Dialog drawer galeri proyek tersimpan
    │   └── InlineTextEditor.svelte  # Live text editor di atas shape kanvas
    │
    └── styles/
        ├── variables.css       # Token warna monokrom (Light & Dark theme)
        ├── global.css          # Reset CSS & tipografi
        └── canvas.css          # Styling elemen kanvas, grid, dan kursor
```

---

## 4. Skema & Definisi Data Inti (`src/types/`)

### A. Model Node (`src/types/node.ts`)
```typescript
export type NodeType = 'process' | 'decision' | 'terminator' | 'image' | 'text-card';

export interface MagneticPin {
  id: string; // misal: 'top', 'right', 'bottom', 'left'
  x: number;
  y: number;
  direction: 'N' | 'E' | 'S' | 'W';
}

export interface FlowNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'center' | 'left' | 'right';
  imageUrl?: string;
  pins: MagneticPin[];
}
```

### B. Model Konektor Garis (`src/types/connector.ts`)
```typescript
export type LineStyle = 'straight' | 'orthogonal' | 'bezier';

export interface FlowConnector {
  id: string;
  sourceNodeId: string;
  sourcePinId: string;
  targetNodeId: string;
  targetPinId: string;
  style: LineStyle;
  strokeWidth: number; // 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0 px
  dashed: boolean;
  arrowStart: boolean;
  arrowEnd: boolean;
  label?: string;
  handles?: Array<{ x: number; y: number }>; // Draggable intermediate points
}
```

### C. Model Proyek & Penyimpanan (`src/types/project.ts`)
```typescript
export interface FlowProject {
  id: string;
  name: string;
  version: string;
  updatedAt: string;
  viewport: {
    panX: number;
    panY: number;
    zoom: number;
    gridSize: number;
  };
  nodes: FlowNode[];
  connectors: FlowConnector[];
}
```

---

## 5. Pemisahan Modul Penting dari Berkas Lama

Saat mengekstrak kode dari `minimalflow.html`, ikuti pemetaan berikut:

1. **Kanvas & Transformasi Matriks (`canvasRenderer.ts`):**
   * Ekstrak fungsi `screenToCanvas(x, y)` dan `canvasToScreen(x, y)`.
   * Isolasi penggambaran grid dot monokrom agar selalu sinkron dengan tingkat `zoom` (0.2x hingga 3.0x).
2. **Konektor Magnetik (`magneticEngine.ts`):**
   * Pindahkan logika snapping pin radius toleransi (biasanya ~15px).
   * Tangani algoritma *ortho line routing* (garis siku otomatis) dan *bezier control point calculation*.
3. **Live Text Editor (`InlineTextEditor.svelte`):**
   * Gunakan koordinat lokal kanvas dengan *vertical centering* otomatis.
   * Dengarkan tombol `Enter` untuk *commit*, `Shift+Enter` untuk baris baru, dan `Escape` untuk membatalkan.
4. **Penyimpanan Lokal (`src/engine/storage.ts`):**
   * Kunci `localStorage`: `minimalflow_projects_v2` dan `minimalflow_active_id`.
   * Pasang mekanisme auto-save debounced (~500ms setelah perubahan terakhir).

---

## 6. Prinsip Desain Estetika (Wajib Dipatuhi)

* 🚫 **Zero Emojis:** Jangan pernah menggunakan emoji unicode pada UI atau kanvas. Seluruh simbol menggunakan ikon SVG monokrom geometris.
* 🖤 **Palet Monokrom Murni:**
  * Background Terang: `#fafafa` | Card: `#ffffff` | Border: `#e4e4e7` | Teks: `#18181b`
  * Background Gelap: `#09090b` | Card: `#18181b` | Border: `#27272a` | Teks: `#f4f4f5`
* 🔤 **Font Standar Studio:** Inter (UI), Fira Code (Technical/ID), Poppins (Headings).

---

## 7. Instruksi Setup & Eksekusi Cepat

Jalankan perintah berikut di terminal untuk menginisialisasi proyek baru:

```bash
# 1. Inisialisasi proyek Svelte + TypeScript via Vite
npm create vite@latest minimalflow-studio -- --template svelte-ts

# 2. Masuk ke direktori
cd minimalflow-studio

# 3. Instal dependensi pendukung
npm install
npm install jspdf

# 4. Jalankan local development server
npm run dev
```

---
*Dokumen ini dirancang sebagai acuan arsitektur definitif untuk merekonstruksi MinimalFlow menjadi web studio profesional modern.*
