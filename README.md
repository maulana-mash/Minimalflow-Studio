<p align="center">
  <a href="https://minimalflow-studio.vercel.app/">
    <img src="assets/branding/logo_black_transparent.png" alt="MinimalFlow Studio Logo" width="160" height="160" />
  </a>
</p>

<h1 align="center">MinimalFlow Studio</h1>

<p align="center">
  <strong>Studio Diagram Alur & Flowchart Monokrom Presisi Tinggi</strong><br>
  Didukung AI Vision Scanner, Kompilasi Mermaid Universal, Parser Prompt Bahasa Alami, dan Ekspor Vektor Retina.
</p>

<p align="center">
  <a href="https://minimalflow-studio.vercel.app/"><img src="https://img.shields.io/badge/Live%20Demo-Vercel%20Production-18181b?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel Live Demo"></a>
  <img src="https://img.shields.io/badge/Architecture-Vanilla%20Web%20Standards-18181b?style=for-the-badge&logo=javascript&logoColor=white" alt="Pure Web Standards">
  <img src="https://img.shields.io/badge/License-MIT-18181b?style=for-the-badge" alt="MIT License">
</p>

---

## Fitur & Kapabilitas Utama

1. **Instan & Ringan (Vanilla Web Standards):**
   * Berjalan murni di peramban web modern tanpa memerlukan proses kompilasi atau bundler yang rumit.
   * Langsung dapat dibuka dengan klik dua kali pada `minimalflow-studio/index.html`.

2. **AI Vision Scanner (Image-to-Flowchart):**
   * Mengintegrasikan Google Gemini Vision API langsung di sisi browser (*client-side*).
   * Pindai screenshot diagram, sketsa papan tulis, atau foto alur kerja; AI otomatis merekonstruksi bentuk geometri, teks, dan arah panah menjadi diagram alur vektor interaktif.

3. **Universal Diagram Importer Engine:**
   * **Mermaid (.mmd / .mermaid):** Parsing otomatis untuk diagram alur hierarkis `TD` dan `LR` lengkap dengan bentuk keputusan, proses, dan terminator.
   * **Skema Kelistrikan & Relai (JSON):** Menerjemahkan wiring netlist standar otomotif DIN 72552 menjadi skema pin magnetik.
   * **Format CAD Native (.flow.json):** Simpan dan muat kembali status kerja penuh kapan saja.

4. **Kontrol Kanvas & Transformasi Vektor:**
   * **8-Way Resize Handles:** Handle pembesaran ke 8 penjuru dengan batas fleksibel hingga dimensi minimal 10x10 px.
   * **Alt Center-Scaling:** Tahan tombol `Alt` saat resize untuk pembesaran simetris dari titik tengah chart.
   * **Ratakan Objek (Alignment):** Ratakan tengah vertikal (`Alt + C`) dan horizontal (`Alt + M`).
   * **Nudge Keyboard:** Geser posisi chart dengan tombol panah (5 px normal, 20 px dengan `Shift`).
   * **Kunci Posisi Cerdas (`Ctrl + L`):** Toggle kunci dan buka kunci posisi chart secara instan.
   * **Multi-Selection & Grouping:** Marquee rubberband (`Shift + Drag`), gabung grup (`Ctrl + G`), dan pisah grup (`Ctrl + Shift + G`).

5. **Kabel & Konektor Magnetik:**
   * 4 Pin magnetik (North, East, South, West) dengan sudut normal adaptif terhadap rotasi.
   * 3 Mode jalur: **Siku Orthogonal (Manhattan)**, **Lengkung Bezier**, dan **Lurus**.
   * **Tap-to-Connect:** Hubungkan pin sumber dan tujuan cukup dengan klik berurutan tanpa drag jauh.

6. **Editor Teks Terintegrasi:**
   * Double-click langsung pada chart untuk mengetik teks.
   * Teks otomatis wrap per-karakter untuk kata panjang tanpa spasi agar tidak keluar dari batas bangun.

7. **Ekspor Resolusi Tinggi:**
   * Vektor SVG Murni (dipotong presisi sesuai batas workspace).
   * PNG Transparan 2x Retina, PNG Background Putih, JPG High Quality.
   * Dokumen PDF Vektor instan dengan pilihan rasio kanvas (16:9, A4, Portrait/Landscape).

---

## Pintasan Keyboard (Shortcuts)

| Pintasan | Tindakan |
|---|---|
| **Ctrl + L** | Kunci / Buka Kunci Posisi Chart |
| **Ctrl + D** | Duplikat Chart Terpilih |
| **Ctrl + C / Ctrl + V** | Salin & Tempel di Tengah Kanvas |
| **Ctrl + G** | Gabungkan ke dalam Grup |
| **Ctrl + Shift + G** | Pisahkan Grup |
| **Alt + C** | Ratakan Tengah Vertikal |
| **Alt + M** | Ratakan Tengah Horizontal |
| **Ctrl + ] / Ctrl + [** | Layer: Naik / Turun 1 Tingkat |
| **Ctrl + Shift + ] / [** | Layer: Paling Depan / Paling Belakang |
| **Arrow Keys** | Geser Chart (5 px / 20 px dengan `Shift`) |
| **Alt + Drag Handle** | Perbesar Simetris dari Titik Pusat |
| **Space + Drag** | Geser Kanvas Bebas (Pan) |
| **Double Click** | Edit Teks Langsung di Dalam Chart |

---

## Cara Menjalankan

Buka berkas `minimalflow-studio/index.html` langsung di peramban web Anda (Chrome, Edge, Firefox), atau jalankan server lokal:

```bash
# Menggunakan Python
python -m http.server 8000

# Atau menggunakan Node (npx)
npx serve .
```
Akses di peramban: `http://localhost:8000/minimalflow-studio/`

---

## Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
